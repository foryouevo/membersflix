-- ============================================================================
-- Migração incremental: banner institucional da plataforma.
-- Rode isto se o seu projeto já tinha o schema.sql aplicado antes desta
-- mudança (schema.sql já foi atualizado e cobre isso em instalações novas).
-- ============================================================================

alter table public.configuracoes
  add column if not exists banner_plataforma_url text;

insert into storage.buckets (id, name, public)
  values ('platform-assets', 'platform-assets', true)
  on conflict (id) do nothing;
