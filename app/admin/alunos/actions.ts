'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
   const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', user.id).maybeSingle() as { data: { tipo: string } | null };
  if ((profile as any)?.tipo !== 'admin') throw new Error('Acesso negado.');
}

export async function criarAluno(input: {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  cursoIds: string[];
}) {
  await assertAdmin();
  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.senha,
    email_confirm: true,
    user_metadata: {
      nome: input.nome,
      telefone: input.telefone ?? null,
      tipo: 'aluno',
      status_pagamento: 'pendente',
    },
  });

  if (error || !created.user) {
    throw new Error(error?.message ?? 'Erro ao criar aluno.');
  }

  if (input.cursoIds.length > 0) {
    await admin.from('acessos_curso').insert(
      input.cursoIds.map((curso_id) => ({
        aluno_id: created.user.id,
        curso_id,
        bloqueado: false,
        liberado_em: new Date().toISOString(),
      }))
    );
  }

  revalidatePath('/admin/alunos');
  return created.user.id;
}

export async function atualizarStatusPagamento(alunoId: string, status: 'pendente' | 'pago') {
  await assertAdmin();
  const admin = createAdminClient();

  const patch: Partial<Profile> = { status_pagamento: status };
  if (status === 'pago') {
    patch.bloqueado = false;
  } else {
    patch.liberado_em = new Date().toISOString();
  }

  const { error } = await admin.from('profiles').update(patch).eq('id', alunoId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/alunos');
}

export async function toggleBloqueioConta(alunoId: string, bloqueado: boolean) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ bloqueado }).eq('id', alunoId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/alunos');
}

export async function vincularCurso(alunoId: string, cursoId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('acessos_curso')
    .upsert(
      { aluno_id: alunoId, curso_id: cursoId, bloqueado: false, liberado_em: new Date().toISOString() },
      { onConflict: 'aluno_id,curso_id' }
    );
  if (error) throw new Error(error.message);
  revalidatePath('/admin/alunos');
}

export async function desvincularCurso(acessoId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('acessos_curso').delete().eq('id', acessoId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/alunos');
}

export async function toggleBloqueioCurso(acessoId: string, bloqueado: boolean) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('acessos_curso').update({ bloqueado }).eq('id', acessoId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/alunos');
}

export async function deletarAluno(alunoId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(alunoId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/alunos');
}
