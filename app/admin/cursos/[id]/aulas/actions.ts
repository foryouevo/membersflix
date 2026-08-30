'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { listFolderContents, isFolder, isVideo, drivePreviewUrl } from '@/lib/google-drive';
import { uploadImagemPublica } from '@/lib/supabase/storage-upload';

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', user.id).maybeSingle();
  if (profile?.tipo !== 'admin') throw new Error('Acesso negado.');
}

export interface ModuloInput {
  titulo: string;
  capa_url?: string | null;
}

export async function criarModulo(cursoId: string, input: ModuloInput, ordem: number) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('modulos')
    .insert({ curso_id: cursoId, titulo: input.titulo, capa_url: input.capa_url ?? null, ordem })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
  revalidatePath(`/membros/curso/${cursoId}`);
  return data;
}

export async function atualizarModulo(id: string, cursoId: string, input: ModuloInput) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('modulos').update({ titulo: input.titulo, capa_url: input.capa_url ?? null }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
  revalidatePath(`/membros/curso/${cursoId}`);
}

/** Upload de capa de módulo. Não grava no banco — devolve a URL pra quem chamou aplicar (igual uploadImagemCurso). */
export async function uploadImagemModulo(formData: FormData) {
  await assertAdmin();

  const arquivo = formData.get('arquivo');
  const chave = formData.get('chave');
  if (!(arquivo instanceof File)) throw new Error('Selecione uma imagem.');
  if (typeof chave !== 'string' || !chave) throw new Error('Chave do módulo ausente.');

  const admin = createAdminClient();
  return uploadImagemPublica(admin, arquivo, `modulos/${chave}/capa`);
}

export async function deletarModulo(id: string, cursoId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('modulos').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
}

export async function reordenarModulos(cursoId: string, ordenados: { id: string; ordem: number }[]) {
  await assertAdmin();
  const admin = createAdminClient();
  await Promise.all(ordenados.map((m) => admin.from('modulos').update({ ordem: m.ordem }).eq('id', m.id)));
  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
}

export interface AulaInput {
  titulo: string;
  descricao?: string | null;
  video_origem: 'upload' | 'url_externa' | 'drive';
  video_url?: string | null;
  thumbnail_url?: string | null;
  duracao_segundos?: number;
  ordem: number;
}

export async function criarAula(moduloId: string, cursoId: string, input: AulaInput) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('aulas').insert({ modulo_id: moduloId, ...input }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
  return data;
}

export async function atualizarAula(id: string, cursoId: string, input: Partial<AulaInput>) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('aulas').update(input).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
}

export async function deletarAula(id: string, cursoId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('aulas').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
}

export async function reordenarAulas(cursoId: string, ordenadas: { id: string; ordem: number }[]) {
  await assertAdmin();
  const admin = createAdminClient();
  await Promise.all(ordenadas.map((a) => admin.from('aulas').update({ ordem: a.ordem }).eq('id', a.id)));
  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
}

export async function adicionarDocumento(aulaId: string, cursoId: string, nome: string, url: string, tipo?: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('documentos').insert({ aula_id: aulaId, nome, url, tipo });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
}

export async function removerDocumento(id: string, cursoId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('documentos').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
}

/**
 * Importa a estrutura de uma pasta do Google Drive para dentro de um curso.
 * Cada subpasta direta vira um Módulo; arquivos de vídeo dentro dela viram Aulas;
 * os demais arquivos (PDF, DOCX, etc.) viram Documentos anexados à última aula criada.
 * A ordem respeita a ordenação por nome retornada pela API do Drive.
 */
export async function importarDoDrive(cursoId: string, folderId: string) {
  await assertAdmin();
  const admin = createAdminClient();

  const subpastas = (await listFolderContents(folderId)).filter(isFolder);

  const { data: modulosExistentes } = await admin.from('modulos').select('id, drive_folder_id').eq('curso_id', cursoId);
  const modulosPorPasta = new Map((modulosExistentes ?? []).map((m) => [m.drive_folder_id, m.id]));

  let moduloOrdem = (modulosExistentes?.length ?? 0);
  let modulosImportados = 0;
  let aulasImportadas = 0;
  let documentosImportados = 0;

  for (const pasta of subpastas) {
    let moduloId = modulosPorPasta.get(pasta.id);

    if (!moduloId) {
      const { data: novoModulo, error } = await admin
        .from('modulos')
        .insert({ curso_id: cursoId, titulo: pasta.name, ordem: moduloOrdem++, drive_folder_id: pasta.id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      moduloId = novoModulo.id;
      modulosImportados++;
    }

    const arquivos = await listFolderContents(pasta.id);
    const { data: aulasExistentes } = await admin.from('aulas').select('id, drive_file_id').eq('modulo_id', moduloId);
    const aulasPorArquivo = new Map((aulasExistentes ?? []).map((a) => [a.drive_file_id, a.id]));

    let aulaOrdem = aulasExistentes?.length ?? 0;
    let ultimaAulaId: string | null = null;

    for (const arquivo of arquivos) {
      if (isFolder(arquivo)) continue;

      if (isVideo(arquivo)) {
        let aulaId = aulasPorArquivo.get(arquivo.id);
        if (!aulaId) {
          const { data: novaAula, error } = await admin
            .from('aulas')
            .insert({
              modulo_id: moduloId,
              titulo: arquivo.name.replace(/\.[^/.]+$/, ''),
              video_origem: 'drive',
              video_url: drivePreviewUrl(arquivo.id),
              drive_file_id: arquivo.id,
              ordem: aulaOrdem++,
            })
            .select()
            .single();
          if (error) throw new Error(error.message);
          aulaId = novaAula.id;
          aulasImportadas++;
        }
        ultimaAulaId = aulaId;
      } else if (ultimaAulaId) {
        const { data: docExistente } = await admin
          .from('documentos')
          .select('id')
          .eq('aula_id', ultimaAulaId)
          .eq('drive_file_id', arquivo.id)
          .maybeSingle();

        if (!docExistente) {
          await admin.from('documentos').insert({
            aula_id: ultimaAulaId,
            nome: arquivo.name,
            url: arquivo.webViewLink ?? `https://drive.google.com/file/d/${arquivo.id}/view`,
            tipo: arquivo.mimeType,
            drive_file_id: arquivo.id,
          });
          documentosImportados++;
        }
      }
    }
  }

  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
  return { modulosImportados, aulasImportadas, documentosImportados };
}
