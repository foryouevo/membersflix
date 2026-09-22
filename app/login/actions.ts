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

/**
 * Cadastro público (aba "Cadastra-se" da tela de login, sem sessão) — usa o
 * client admin (service role) igual verificarStatusPorEmail acima, pelos
 * mesmos dois motivos: não tem sessão ainda (não dá pra usar o client
 * comum, que respeita RLS como o usuário logado) e criar usuário com senha
 * + `email_confirm: true` só é possível com o client admin.
 *
 * "Cada pessoa pode fazer apenas um cadastro" (e-mail único): não
 * precisa de checagem própria — o Supabase Auth já garante isso sozinho
 * (email é UNIQUE em auth.users); `admin.auth.admin.createUser` retorna
 * erro se o e-mail já existir, só traduzido pra uma mensagem amigável
 * abaixo.
 *
 * `email_confirm: true` (decisão confirmada): login liberado na hora,
 * sem fluxo de confirmação por e-mail — mesmo padrão que
 * app/admin/alunos/actions.ts (criarAluno) já usa pro aluno criado pelo
 * admin.
 *
 * `cadastro_publico: true` (migration 012): diferencia esta conta de uma
 * criada pelo admin pra regra de bloqueio pós-trial de 30min certa — só o
 * curso escolhido é bloqueado se o trial expirar sem pagamento (não a
 * conta inteira), decisão confirmada com o usuário. handle_new_user()
 * (schema.sql) já cria a linha em `profiles` a partir de `user_metadata`
 * — falta só marcar esse campo, que não é lido por esse trigger.
 */
export async function cadastrarAlunoPublico(input: { nome: string; email: string; senha: string; cursoId: string }) {
  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();
  const senha = input.senha;
  const cursoId = input.cursoId;

  if (!nome) throw new Error('Informe seu nome.');
  if (!email) throw new Error('Informe seu e-mail.');
  if (senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  if (!cursoId) throw new Error('Escolha um curso pra começar.');

  const admin = createAdminClient();

  // Confirma que o curso existe e está ativo — evita um cadastro apontando
  // pra um curso removido/inativo via manipulação do formulário (o campo é
  // um <select>, mas o valor ainda chega como string solta na action).
  const { data: curso } = await admin.from('cursos').select('id').eq('id', cursoId).eq('status', 'active').maybeSingle();
  if (!curso) throw new Error('Curso inválido — atualize a página e tente de novo.');

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, tipo: 'aluno', status_pagamento: 'pendente' },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('existe')) {
      throw new Error('Este e-mail já está cadastrado. Faça login normalmente.');
    }
    throw new Error(error.message);
  }
  if (!created.user) throw new Error('Erro ao criar cadastro.');

  // as any: types/database.types.ts (gerado) ainda não conhece
  // `cadastro_publico` (migration 012) — mesmo cast usado em todo lugar
  // que lida com coluna de migration pendente neste projeto (ver `slug`).
  const { error: erroProfile } = await (admin.from('profiles') as any).update({ cadastro_publico: true }).eq('id', created.user.id);
  if (erroProfile) throw new Error(erroProfile.message);

  // bloqueado: false, liberado_em: agora — mesmo shape do insert que
  // criarAluno (app/admin/alunos/actions.ts) já faz pro aluno criado pelo
  // admin; é o `liberado_em` daqui que a Regra 3 nova (migration 012) usa
  // pra saber quando os 30min de trial DESTE curso específico vencem.
  const { error: erroAcesso } = await admin
    .from('acessos_curso')
    .insert({ aluno_id: created.user.id, curso_id: cursoId, bloqueado: false, liberado_em: new Date().toISOString() });
  if (erroAcesso) throw new Error(erroAcesso.message);

  return { email, senha };
}
