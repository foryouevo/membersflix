'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type ResultadoCadastroPublico = { ok: true; email: string; senha: string } | { ok: false; erro: string };

/**
 * Cadastro público (aba "Cadastra-se" da tela de login, sem sessão) — usa o
 * client admin (service role) pelos dois
 * motivos: não tem sessão ainda (não dá pra usar o client
 * comum, que respeita RLS como o usuário logado) e criar usuário com senha
 * + `email_confirm: true` só é possível com o client admin.
 *
 * Retorna um resultado tipado ({ ok, erro }) em vez de LANÇAR erro (era
 * `throw new Error(...)`): num build de produção o Next.js mascara a
 * mensagem de qualquer erro lançado por Server Action ("An error occurred
 * in the Server Components render. The specific message is omitted..."), o
 * que escondia do aluno o motivo real ("e-mail já cadastrado", "senha
 * curta" etc.). Valores retornados NÃO são mascarados.
 *
 * Rollback: depois que o usuário do Auth é criado, qualquer falha nos
 * passos seguintes (marcar cadastro_publico, criar o acesso ao curso)
 * apaga esse usuário — sem isso ficava uma conta "órfã" (existe no Auth,
 * mas sem acesso a curso nenhum) e a nova tentativa do aluno caía em "este
 * e-mail já está cadastrado" sem nunca ter conseguido se cadastrar.
 */
export async function cadastrarAlunoPublico(input: {
  nome: string;
  email: string;
  senha: string;
  cursoId: string;
}): Promise<ResultadoCadastroPublico> {
  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();
  const senha = input.senha;
  const cursoId = input.cursoId;

  if (!nome) return { ok: false, erro: 'Informe seu nome.' };
  if (!email) return { ok: false, erro: 'Informe seu e-mail.' };
  if (senha.length < 6) return { ok: false, erro: 'A senha precisa ter pelo menos 6 caracteres.' };
  if (!cursoId) return { ok: false, erro: 'Escolha um curso pra começar.' };

  try {
    const admin = createAdminClient();

    // Confirma que o curso existe e está ativo — evita um cadastro apontando
    // pra um curso removido/inativo via manipulação do formulário (o campo é
    // um <select>, mas o valor ainda chega como string solta na action).
    const { data: curso } = await admin.from('cursos').select('id').eq('id', cursoId).eq('status', 'active').maybeSingle();
    if (!curso) return { ok: false, erro: 'Curso inválido — atualize a página e tente de novo.' };

    // "Cada pessoa pode fazer apenas um cadastro" (e-mail único): o Supabase
    // Auth já garante isso (email é UNIQUE em auth.users) — createUser
    // retorna erro se já existir, traduzido abaixo.
    // `email_confirm: true`: login liberado na hora, sem confirmação por
    // e-mail — mesmo padrão de criarAluno (app/admin/alunos/actions.ts).
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      // cadastro_publico também em user_metadata: guarda a origem da conta
      // mesmo que a coluna profiles.cadastro_publico (migration 012) ainda
      // não exista no banco — a migration faz backfill a partir daqui.
      user_metadata: { nome, tipo: 'aluno', status_pagamento: 'pendente', cadastro_publico: true },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || msg.includes('existe') || msg.includes('duplicate')) {
        return { ok: false, erro: 'Este e-mail já está cadastrado. Faça login normalmente.' };
      }
      if (msg.includes('password')) return { ok: false, erro: 'Senha inválida — use pelo menos 6 caracteres.' };
      if (msg.includes('email') && msg.includes('invalid')) return { ok: false, erro: 'E-mail inválido.' };
      console.error('[cadastro] createUser falhou:', error.message);
      return { ok: false, erro: 'Não foi possível criar sua conta agora. Tente novamente em instantes.' };
    }
    if (!created.user) return { ok: false, erro: 'Não foi possível criar sua conta agora. Tente novamente em instantes.' };

    const userId = created.user.id;
    const desfazer = async () => {
      const { error: erroRollback } = await admin.auth.admin.deleteUser(userId);
      if (erroRollback) console.error('[cadastro] rollback (deleteUser) falhou:', erroRollback.message);
    };

    // `cadastro_publico: true` (migration 012) diferencia esta conta de uma
    // criada pelo admin pra regra de bloqueio pós-trial certa (só o curso
    // escolhido é bloqueado, não a conta inteira). handle_new_user()
    // (schema.sql) já criou a linha em `profiles` a partir de
    // `user_metadata` — falta só marcar esse campo. as any: types/
    // database.types.ts (gerado) ainda não conhece a coluna.
    const { error: erroProfile } = await (admin.from('profiles') as any).update({ cadastro_publico: true }).eq('id', userId);
    if (erroProfile) {
      // PGRST204 / 42703 = coluna inexistente: migration 012 ainda não foi
      // aplicada no banco. NÃO bloqueia o cadastro (a origem já foi gravada
      // em user_metadata acima e a migration faz o backfill); só avisa no
      // log do servidor. Qualquer outro erro é real: desfaz a conta.
      if (erroProfile.code === 'PGRST204' || erroProfile.code === '42703') {
        console.warn('[cadastro] profiles.cadastro_publico não existe ainda (aplicar migration 012) — seguindo só com user_metadata.');
      } else {
        console.error('[cadastro] update profiles.cadastro_publico falhou:', erroProfile.code, erroProfile.message);
        await desfazer();
        return { ok: false, erro: 'Não foi possível concluir seu cadastro. Tente novamente em instantes.' };
      }
    }

    // bloqueado: false, liberado_em: agora — mesmo shape do insert que
    // criarAluno já faz; é o `liberado_em` daqui que a Regra 3 (migration
    // 012) usa pra saber quando os 30min de trial DESTE curso vencem.
    const { error: erroAcesso } = await admin
      .from('acessos_curso')
      .insert({ aluno_id: userId, curso_id: cursoId, bloqueado: false, liberado_em: new Date().toISOString() });
    if (erroAcesso) {
      console.error('[cadastro] insert acessos_curso falhou:', erroAcesso.message);
      await desfazer();
      return { ok: false, erro: 'Não foi possível liberar seu curso. Tente novamente em instantes.' };
    }

    return { ok: true, email, senha };
  } catch (err) {
    console.error('[cadastro] erro inesperado:', err);
    return { ok: false, erro: 'Erro inesperado ao criar cadastro. Tente novamente em instantes.' };
  }
}
