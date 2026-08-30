'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { VitrineSecaoTipo } from '@/types';

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', user.id).maybeSingle();
  if (profile?.tipo !== 'admin') throw new Error('Acesso negado.');
}

export async function criarSecao(titulo: string, tipo: VitrineSecaoTipo, categoriaId: string | null, ordem: number) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vitrine_secoes')
    .insert({ titulo, tipo, categoria_id: categoriaId, ordem })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/admin/vitrine');
  revalidatePath('/membros/vitrine');
  return data;
}

export async function atualizarSecao(id: string, titulo: string, categoriaId: string | null) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('vitrine_secoes').update({ titulo, categoria_id: categoriaId }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/vitrine');
  revalidatePath('/membros/vitrine');
}

export async function deletarSecao(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('vitrine_secoes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/vitrine');
  revalidatePath('/membros/vitrine');
}

export async function reordenarSecoes(ordenadas: { id: string; ordem: number }[]) {
  await assertAdmin();
  const admin = createAdminClient();
  await Promise.all(ordenadas.map((s) => admin.from('vitrine_secoes').update({ ordem: s.ordem }).eq('id', s.id)));
  revalidatePath('/admin/vitrine');
  revalidatePath('/membros/vitrine');
}

export async function adicionarCursoNaSecao(secaoId: string, cursoId: string, ordem: number) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('vitrine_secao_cursos').upsert(
    { secao_id: secaoId, curso_id: cursoId, ordem },
    { onConflict: 'secao_id,curso_id' }
  );
  if (error) throw new Error(error.message);
  revalidatePath('/admin/vitrine');
  revalidatePath('/membros/vitrine');
}

export async function removerCursoDaSecao(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('vitrine_secao_cursos').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/vitrine');
  revalidatePath('/membros/vitrine');
}

export async function reordenarCursosDaSecao(ordenados: { id: string; ordem: number }[]) {
  await assertAdmin();
  const admin = createAdminClient();
  await Promise.all(ordenados.map((c) => admin.from('vitrine_secao_cursos').update({ ordem: c.ordem }).eq('id', c.id)));
  revalidatePath('/admin/vitrine');
  revalidatePath('/membros/vitrine');
}
