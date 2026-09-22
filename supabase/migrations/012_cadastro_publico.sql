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

-- REGRA 1 (bloqueio de CONTA INTEIRA) — só muda o WHERE: agora ignora
-- contas de cadastro público, que têm a regra própria abaixo (REGRA 3).
-- Sem essa exclusão, uma conta de cadastro público ficaria bloqueada nos
-- DOIS níveis (conta inteira E curso), contradizendo "continua logando
-- normalmente".
create or replace function public.bloquear_pagamentos_pendentes()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set bloqueado = true
  where status_pagamento = 'pendente'
    and bloqueado = false
    and cadastro_publico = false
    and liberado_em + interval '30 minutes' < now();
$$;

-- REGRA 3 (NOVA) — equivalente à Regra 1, mas por CURSO em vez de conta
-- inteira: só entra em ação pra `cadastro_publico = true`. Usa
-- `acessos_curso.liberado_em` (coluna que já existia, preenchida desde
-- sempre em todo INSERT — ver criarAluno em app/admin/alunos/actions.ts —
-- mas até agora nada LIA esse valor pra tomar decisão nenhuma).
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
    and p.cadastro_publico = true
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
