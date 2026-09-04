'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
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

export interface CursoInput {
  titulo: string;
  descricao?: string;
  categoria_id?: string | null;
  capa_url?: string | null;
  thumbnail_url?: string | null;
  instrutor_nome?: string | null;
  instrutor_bio?: string | null;
  instrutor_avatar_url?: string | null;
  status: 'active' | 'inactive';
  mensagem_whatsapp: string;
  drive_folder_id?: string | null;
}

export async function criarCategoria(nome: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('categorias').insert({ nome }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath('/admin/cursos');
  return data;
}

export async function criarCurso(input: CursoInput) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('cursos').insert(input).select().single();
  if (error) throw new Error(error.message);
  revalidatePath('/admin/cursos');
  revalidatePath('/admin/vitrine');
  return data;
}

export async function atualizarCurso(id: string, input: Partial<CursoInput>) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('cursos').update(input).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/cursos');
  revalidatePath('/admin/vitrine');
  revalidatePath(`/admin/cursos/${id}/aulas`);
}

export async function toggleStatusCurso(id: string, status: 'active' | 'inactive') {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('cursos').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/cursos');
}

/**
 * Upload de capa/thumbnail de curso. Não grava no banco — devolve a URL
 * pública pro form preencher o campo localmente; a persistência acontece
 * no submit normal do modal (criarCurso/atualizarCurso), igual aos demais
 * campos. `chave` identifica a pasta no Storage: usa o id do curso quando
 * já existe, ou um id temporário gerado no client ao criar um curso novo.
 */
export async function uploadImagemCurso(formData: FormData) {
  await assertAdmin();

  const arquivo = formData.get('arquivo');
  const campo = formData.get('campo');
  const chave = formData.get('chave');

  if (!(arquivo instanceof File)) throw new Error('Selecione uma imagem.');
  if (campo !== 'capa' && campo !== 'thumbnail') throw new Error('Campo de imagem inválido.');
  if (typeof chave !== 'string' || !chave) throw new Error('Chave do curso ausente.');

  const admin = createAdminClient();
  return uploadImagemPublica(admin, arquivo, `cursos/${chave}/${campo}`);
}

export async function deletarCurso(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('cursos').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/cursos');
  revalidatePath('/admin/vitrine');
}
