-- ============================================================================
-- Migração incremental: capa/thumbnail de módulo (vitrine de módulos na
-- tela do curso). Rode isto se o seu projeto já tinha o schema.sql aplicado
-- antes desta mudança (schema.sql já foi atualizado e cobre isso em
-- instalações novas).
-- ============================================================================

alter table public.modulos
  add column if not exists capa_url text;
