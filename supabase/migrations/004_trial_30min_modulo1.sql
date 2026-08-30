-- ============================================================================
-- Migração incremental: reduz a janela de trial de pagamento pendente de 1h
-- pra 30min, e passa a restringir o acesso, durante esse trial, só ao
-- primeiro módulo (menor `ordem`) de cada curso. Rode isto se o seu projeto
-- já tinha o schema.sql aplicado antes desta mudança (schema.sql já foi
-- atualizado e cobre isso em instalações novas).
-- ============================================================================

-- REGRA 1: agora 30 minutos em vez de 1 hora.
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
    and liberado_em + interval '30 minutes' < now();
$$;

-- REGRA 2: enquanto o pagamento está pendente (ou seja, ainda dentro dos
-- 30min de trial — passado isso a conta já fica bloqueada pela regra acima,
-- então essa função nem chega a ser consultada), só o módulo de menor
-- `ordem` do curso fica acessível. Quem já pagou (ou é admin) não tem essa
-- restrição — acesso total assim que `status_pagamento` vira 'pago'.
create or replace function public.pode_acessar_modulo(uid uuid, mid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin(uid)
    or (select status_pagamento from public.profiles where id = uid) = 'pago'
    or exists (
      select 1 from public.modulos m
      where m.id = mid
        and m.ordem = (select min(ordem) from public.modulos where curso_id = m.curso_id)
    );
$$;

-- aulas / documentos: mesma checagem de sempre (tem_acesso_curso) + a nova
-- trava por módulo. Isso é o que garante que a restrição funciona mesmo por
-- URL direta da aula, não só na exibição do cadeado na tela do curso.
drop policy if exists aulas_select on public.aulas;
create policy aulas_select on public.aulas for select
  using (
    public.is_admin(auth.uid()) or
    exists (
      select 1 from public.modulos m
      where m.id = aulas.modulo_id
        and public.tem_acesso_curso(auth.uid(), m.curso_id)
        and public.pode_acessar_modulo(auth.uid(), m.id)
    )
  );

drop policy if exists documentos_select on public.documentos;
create policy documentos_select on public.documentos for select
  using (
    public.is_admin(auth.uid()) or
    exists (
      select 1 from public.aulas a
      join public.modulos m on m.id = a.modulo_id
      where a.id = documentos.aula_id
        and public.tem_acesso_curso(auth.uid(), m.curso_id)
        and public.pode_acessar_modulo(auth.uid(), m.id)
    )
  );
