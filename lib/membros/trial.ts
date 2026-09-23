import { createAdminClient } from '@/lib/supabase/admin';

// Janela de trial (pedido de sempre: 30 minutos a partir da liberação do
// acesso ao curso).
export const TRIAL_MS = 30 * 60 * 1000;

/**
 * Bloqueio pós-trial POR CURSO, aplicado em tempo real (chamado pelo
 * middleware a cada request de aluno com pagamento pendente): marca como
 * bloqueado (`acessos_curso.bloqueado = true`) todo acesso cujo trial
 * (liberado_em + 30min) já venceu. Só isso — a conta em si NUNCA é
 * bloqueada por trial expirado (profiles.bloqueado é só do admin): o aluno
 * continua logando e navegando, e só o curso aparece com cadeado.
 *
 * Por que gravar no banco em vez de calcular na hora em cada tela: todas as
 * telas (Início, Meus Cursos, detalhe do curso, player, rota de vídeo, RLS)
 * já leem `acessos_curso.bloqueado` — gravar aqui faz TODAS refletirem o
 * bloqueio sem alterar nenhuma delas, e sem depender do pg_cron (que roda a
 * cada 5min) nem da migration 012. Idempotente (só toca em quem ainda está
 * bloqueado = false). Usa o client admin porque a RLS não deixa o aluno
 * alterar o próprio acesso (e nem deve).
 *
 * Retorna quantos acessos foram bloqueados agora (0 na maioria dos
 * requests).
 */
export async function bloquearAcessosComTrialExpirado(alunoId: string): Promise<number> {
  const limite = new Date(Date.now() - TRIAL_MS).toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('acessos_curso')
    .update({ bloqueado: true })
    .eq('aluno_id', alunoId)
    .eq('bloqueado', false)
    .lt('liberado_em', limite)
    .select('id');
  if (error) {
    console.error('[trial] falha ao bloquear acessos com trial expirado:', error.message);
    return 0;
  }
  return data?.length ?? 0;
}
