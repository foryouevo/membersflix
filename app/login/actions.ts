'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type StatusEmailLogin = 'ativo' | 'inativo' | 'nao_encontrado';

/**
 * Usado só pelo link "Esqueceu a senha?" da tela de login, pra decidir entre
 * mostrar o modal "fale com o suporte" (aluno com pagamento ativo — troca de
 * senha é manual, por segurança) ou seguir o fluxo padrão de recuperação por
 * email. Roda sem sessão (a tela de login não tem usuário logado), por isso
 * usa o client admin (service role) só aqui dentro, no servidor — a chave
 * nunca chega no browser. Retorna só um status resumido, nunca dados do
 * perfil (nome, telefone etc.), pra essa checagem não virar uma forma de
 * vazar quem tem conta ativa na plataforma.
 *
 * "Ativo" aqui segue a mesma regra já usada no resto do sistema (ver
 * middleware.ts): status_pagamento = 'pago' e não bloqueado. Pendente ou
 * bloqueado cai no fluxo padrão de recuperação — não faz sentido mandar
 * quem ainda nem pagou pro suporte trocar senha manualmente.
 */
export async function verificarStatusPorEmail(email: string): Promise<StatusEmailLogin> {
  const emailLimpo = email.trim().toLowerCase();
  if (!emailLimpo) return 'nao_encontrado';

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('status_pagamento, bloqueado')
    .ilike('email', emailLimpo)
    .maybeSingle();

  if (!profile) return 'nao_encontrado';
  if (profile.bloqueado) return 'inativo';
  return profile.status_pagamento === 'pago' ? 'ativo' : 'inativo';
}
