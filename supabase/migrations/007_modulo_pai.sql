-- ============================================================================
-- Migração incremental: hierarquia de 2 níveis em módulos (módulo "pai" /
-- guarda-chuva + submódulos filhos), pra representar corretamente pastas do
-- Drive que agrupam vários submódulos reais (ex: "[02] Filmmaking Avançado"
-- contendo "Módulo 01 - X", "Módulo 02 - Y" etc, cada uma com suas próprias
-- aulas) sem achatar tudo num módulo só. Rode isto se seu projeto já tinha o
-- schema.sql aplicado antes desta mudança (schema.sql já foi atualizado e
-- cobre isso em instalações novas).
-- ============================================================================

alter table public.modulos
  add column if not exists modulo_pai_id uuid references public.modulos(id) on delete cascade;

-- Índice pra achar rápido "quais são os filhos deste pai" (usado o tempo
-- todo na tela de gerenciamento de aulas e na importação do Drive).
create index if not exists modulos_modulo_pai_id_idx on public.modulos (modulo_pai_id);

-- Um módulo "pai" (guarda-chuva) nunca tem aula própria — as aulas ficam nos
-- filhos —, então ele não deve contar como candidato ao "Módulo 1 liberado
-- durante o trial de 30min" (ver REGRA 2, em 004_trial_30min_modulo1.sql):
-- sem esse ajuste, se o módulo de menor `ordem` do curso virasse um pai vazio,
-- o aluno em trial ficaria com acesso liberado a um módulo sem nenhum
-- conteúdo. Substitui `pode_acessar_modulo` pra escolher o menor `ordem`
-- só entre módulos-FOLHA (que não são pai de ninguém).
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
        and m.ordem = (
          select min(m2.ordem) from public.modulos m2
          where m2.curso_id = m.curso_id
            and not exists (select 1 from public.modulos filho where filho.modulo_pai_id = m2.id)
        )
    );
$$;
