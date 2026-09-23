-- Cadastro público (tela de login, aba "Cadastra-se") — pedido explícito:
-- aluno se cadastra sozinho, escolhe UM curso inicial, entra na hora,
-- status "pendente", 30min de trial nesse curso. Decisão confirmada com o
-- usuário: o bloqueio pós-trial dessas contas é POR CURSO (só aquele
-- acesso_curso fica marcado bloqueado — o aluno continua logando e
-- navegando o site normalmente), separado do mecanismo já existente de
-- bloqueio de CONTA INTEIRA (profiles.bloqueado, tela /bloqueado — que
-- continua valendo, sem nenhuma mudança, pros alunos cadastrados pelo
-- admin em app/admin/alunos/actions.ts).
--
-- cadastro_publico: é o que diferencia as duas origens de conta pras
-- regras abaixo. false (default) preserva o comportamento de sempre pra
-- toda conta já existente.
alter table public.profiles add column if not exists cadastro_publico boolean not null default false;

-- Backfill: contas criadas pelo cadastro público ANTES desta coluna existir
-- (a server action grava `cadastro_publico: true` em auth.users.
-- raw_user_meta_data desde sempre) recebem a marca agora. Idempotente.
update public.profiles p
set cadastro_publico = true
from auth.users u
where u.id = p.id
  and u.raw_user_meta_data->>'cadastro_publico' = 'true'
  and p.cadastro_publico = false;

-- REGRA 1 (bloqueio de CONTA INTEIRA pós-trial) — DESLIGADA. Decisão
-- (regressão reportada): trial expirado nunca mais bloqueia a conta
-- inteira (tela cheia "Acesso pendente", só com "Sair") — o aluno continua
-- logando/navegando e só o CURSO fica bloqueado (REGRA 3 abaixo, valendo
-- pra QUALQUER conta com pagamento pendente, não só cadastro público).
-- Mantém a função (o job pg_cron antigo continua chamando ela) mas sem
-- fazer nada; bloqueio manual de conta pelo admin (profiles.bloqueado via
-- toggleBloqueioConta) não passa por aqui e segue funcionando.
create or replace function public.bloquear_pagamentos_pendentes()
returns void
language sql
security definer
set search_path = public
as $$
  select 1;
$$;

-- REGRA 3 — bloqueio POR CURSO: acesso cujo trial (liberado_em + 30min)
-- venceu, de conta com pagamento pendente, vira bloqueado. O app também
-- aplica isso em tempo real (lib/membros/trial.ts, chamado pelo
-- middleware) — este job é a rede de segurança pra quem não abre o site.
create or replace function public.bloquear_acessos_curso_pendentes()
returns void
language sql
security definer
set search_path = public
as $$
  update public.acessos_curso ac
  set bloqueado = true
  from public.profiles p
  where ac.aluno_id = p.id
    and p.status_pagamento = 'pendente'
    and ac.bloqueado = false
    and ac.liberado_em + interval '30 minutes' < now();
$$;

-- Mesmo agendamento (a cada 5 minutos) da Regra 1, mesmo padrão de "só
-- cria se não existir ainda" — ver supabase/schema.sql pra essa mesma
-- regra na primeira instalação.
select cron.schedule(
  'bloquear-acessos-curso-pendentes',
  '*/5 * * * *',
  $$select public.bloquear_acessos_curso_pendentes();$$
) where not exists (
  select 1 from cron.job where jobname = 'bloquear-acessos-curso-pendentes'
);
