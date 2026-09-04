'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { listFolderContents, isFolder, isVideo, drivePreviewUrl, type DriveFile } from '@/lib/google-drive';
import { uploadImagemPublica } from '@/lib/supabase/storage-upload';

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
   const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', user.id).maybeSingle() as { data: { tipo: string } | null };
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

// Pastas com esse nome nunca viram módulo/submódulo — o conteúdo delas
// (PDF, DOCX etc.) sempre vira Documento anexado à última aula encontrada na
// pasta-módulo onde elas foram achadas, não uma seção própria na plataforma.
const PASTA_MATERIAL_REGEX = /material\s*de\s*apoio|materiais\s*complementares/i;

function isPastaDeMaterial(file: DriveFile) {
  return isFolder(file) && PASTA_MATERIAL_REGEX.test(file.name);
}

/**
 * Importa a estrutura de uma pasta do Google Drive para dentro de um curso.
 *
 * Uma pasta do Drive só vira Módulo-FOLHA (com aulas de verdade) se tiver
 * vídeo DIRETO dentro dela — senão ela é uma pasta "guarda-chuva" (ex: "[02]
 * Filmmaking Avançado" só agrupa "Módulo 01 - X", "Módulo 02 - Y" etc, sem
 * nenhum vídeo solto nela mesma). Nesse caso, a guarda-chuva também vira um
 * módulo — um módulo "PAI" (sem aula própria, `modulo_pai_id = null`, só de
 * cabeçalho/agrupador) — e cada subpasta dela vira um módulo "FILHO"
 * (`modulo_pai_id` apontando pro pai), preservando a hierarquia real de 2
 * níveis do Drive em vez de achatar tudo num nível só. Isso vale em qualquer
 * profundidade de pastas (`processarPasta`, abaixo) — mas só o PRIMEIRO
 * ancestral guarda-chuva de uma cadeia vira pai: se uma guarda-chuva tiver
 * outra guarda-chuva dentro (raro, não visto nos cursos atuais), a de baixo
 * não gera um 3º nível, os filhos dela são linkados direto ao mesmo pai já
 * criado — o modelo de dados só suporta 2 níveis, de propósito.
 *
 * Dentro de uma pasta-folha (que virou módulo filho ou raiz), os vídeos
 * encontrados viram Aulas; pastas de "Material de Apoio"/"Materiais
 * Complementares" (ver PASTA_MATERIAL_REGEX) NUNCA viram módulo — seu
 * conteúdo vira Documento anexado à última aula daquela pasta-folha (mesma
 * regra de sempre). Módulos e aulas já importados (mesmo
 * drive_folder_id/drive_file_id) não são duplicados — são só reaproveitados
 * (e o `modulo_pai_id` de um módulo já existente é sincronizado de novo a
 * cada reimportação, pra migrar dados importados antes desta hierarquia
 * existir).
 */
export async function importarDoDrive(cursoId: string, folderId: string) {
  await assertAdmin();
  const admin = createAdminClient();

  const { data: modulosExistentes } = await admin.from('modulos').select('id, drive_folder_id').eq('curso_id', cursoId);
  const modulosPorPasta = new Map((modulosExistentes ?? []).map((m) => [m.drive_folder_id, m.id]));

  let moduloOrdem = modulosExistentes?.length ?? 0;
  let modulosImportados = 0;
  let aulasImportadas = 0;
  let documentosImportados = 0;

  // Cria (ou reaproveita, se já existe pelo drive_folder_id) um módulo pra
  // essa pasta, sincronizando modulo_pai_id — usado tanto pra módulo-pai
  // (paiId = null) quanto módulo-folha (paiId = id do pai, ou null se for
  // raiz mesmo).
  async function obterOuCriarModulo(pasta: DriveFile, paiId: string | null): Promise<string> {
    let moduloId = modulosPorPasta.get(pasta.id);
    if (!moduloId) {
      const { data: novoModulo, error } = await admin
        .from('modulos')
        .insert({ curso_id: cursoId, titulo: pasta.name, ordem: moduloOrdem++, drive_folder_id: pasta.id, modulo_pai_id: paiId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      moduloId = novoModulo.id;
      modulosPorPasta.set(pasta.id, moduloId);
      modulosImportados++;
    } else {
      // Sincroniza o pai em módulos já existentes (migra quem foi importado
      // antes da hierarquia existir, ou corrige se a estrutura no Drive mudou).
      await admin.from('modulos').update({ modulo_pai_id: paiId }).eq('id', moduloId);
    }
    return moduloId;
  }

  // Processa o conteúdo DIRETO de uma pasta-folha (que já virou módulo):
  // vídeos viram aula; pastas de material descem recursivamente (podem ter
  // sub-subpastas) e tudo dentro delas vira documento da última aula; pastas
  // que não são de material são ignoradas aqui — cada uma já foi tratada à
  // parte, como um módulo/submódulo independente, em `processarPasta`.
  async function importarConteudoDoModulo(moduloId: string, itensDiretos: DriveFile[]) {
    const { data: aulasExistentes } = await admin.from('aulas').select('id, drive_file_id').eq('modulo_id', moduloId);
    const aulasPorArquivo = new Map((aulasExistentes ?? []).map((a) => [a.drive_file_id, a.id]));

    let aulaOrdem = aulasExistentes?.length ?? 0;
    let ultimaAulaId: string | null = null;

    const processarNivel = async (itens: DriveFile[]): Promise<void> => {
      for (const item of itens) {
        if (isFolder(item)) {
          if (isPastaDeMaterial(item)) {
            await processarNivel(await listFolderContents(item.id));
          }
          continue;
        }

        if (isVideo(item)) {
          let aulaId = aulasPorArquivo.get(item.id);
          if (!aulaId) {
            const { data: novaAula, error } = await admin
              .from('aulas')
              .insert({
                modulo_id: moduloId,
                titulo: item.name.replace(/\.[^/.]+$/, ''),
                video_origem: 'drive',
                video_url: drivePreviewUrl(item.id),
                drive_file_id: item.id,
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
            .eq('drive_file_id', item.id)
            .maybeSingle();

          if (!docExistente) {
            await admin.from('documentos').insert({
              aula_id: ultimaAulaId,
              nome: item.name,
              url: item.webViewLink ?? `https://drive.google.com/file/d/${item.id}/view`,
              tipo: item.mimeType,
              drive_file_id: item.id,
            });
            documentosImportados++;
          }
        }
      }
    };

    await processarNivel(itensDiretos);
  }

  // Avalia uma pasta candidata dentro do contexto de um pai (`obterPaiId`,
  // uma função — não um valor já resolvido): se tem vídeo direto, é uma
  // pasta-folha — cria/reaproveita o módulo (filho do pai atual) e importa o
  // conteúdo dela. Se NÃO tem vídeo direto mas tem subpastas-candidatas, ela
  // é uma guarda-chuva: cada subpasta desce como filha de um pai "sob
  // demanda" (só materializado quando o primeiro filho de verdade precisar
  // dele — ver `paiPreguicoso`). Uma pasta sem vídeo e sem subpasta
  // candidata é um beco sem saída — não gera módulo nenhum (nem vazio, nem
  // fantasma). É esse "sob demanda" que evita criar um módulo-pai pra uma
  // guarda-chuva cujas subpastas são todas becos sem saída (ex: uma pasta só
  // com listas de PDF, sem vídeo em lugar nenhum) — sem isso, viraria um pai
  // vazio, sem nenhum filho.
  async function processarPasta(pasta: DriveFile, obterPaiId: () => Promise<string | null>): Promise<void> {
    const filhos = await listFolderContents(pasta.id);
    const temVideoDireto = filhos.some(isVideo);
    const subpastasSubmodulo = filhos.filter((f) => isFolder(f) && !isPastaDeMaterial(f));

    if (temVideoDireto) {
      const paiId = await obterPaiId();
      const moduloId = await obterOuCriarModulo(pasta, paiId);
      await importarConteudoDoModulo(moduloId, filhos);
      // Caso raro/misto: se essa pasta-folha ainda tiver subpastas reais
      // (não-material) além do vídeo direto, elas entram como filhas do
      // MESMO pai desta pasta (não como netas dela — só 2 níveis).
      for (const sub of subpastasSubmodulo) {
        await processarPasta(sub, obterPaiId);
      }
    } else if (subpastasSubmodulo.length > 0) {
      let paiPreguicoso: Promise<string | null> | null = null;
      const proximoObterPaiId = async (): Promise<string | null> => {
        const paiExistente = await obterPaiId();
        if (paiExistente) return paiExistente; // já tem pai resolvido acima na cadeia — não cria um 3º nível
        if (!paiPreguicoso) paiPreguicoso = obterOuCriarModuloComoPai(pasta);
        return paiPreguicoso;
      };
      for (const sub of subpastasSubmodulo) {
        await processarPasta(sub, proximoObterPaiId);
      }
    }
  }

  // Cria/reaproveita o módulo-pai (guarda-chuva, modulo_pai_id sempre null —
  // um pai nunca é filho de outro pai, evitando 3 níveis).
  async function obterOuCriarModuloComoPai(pasta: DriveFile): Promise<string> {
    return obterOuCriarModulo(pasta, null);
  }

  const subpastasRaiz = (await listFolderContents(folderId)).filter(isFolder);
  for (const pasta of subpastasRaiz) {
    await processarPasta(pasta, async () => null);
  }

  revalidatePath(`/admin/cursos/${cursoId}/aulas`);
  return { modulosImportados, aulasImportadas, documentosImportados };
}
