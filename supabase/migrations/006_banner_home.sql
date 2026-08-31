-- Banner editável da Home (/membros/vitrine): capa sem texto embutido +
-- badge/resumo renderizados em código (ver components/membros/VitrinePageClient.tsx).
alter table public.configuracoes
  add column if not exists banner_capa_url text,
  add column if not exists banner_badge text,
  add column if not exists banner_resumo text;
