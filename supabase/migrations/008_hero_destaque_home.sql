-- Imagem de fundo do hero em destaque da Home (CursoDestaque —
-- components/membros/CursoDestaque.tsx), campo próprio e isolado: não reusa
-- nem cursos.capa_url (capa de cada curso) nem configuracoes.banner_capa_url
-- (o "Banner da Página Inicial" existente, uma camada visual separada, atrás
-- do card). Sem imagem cadastrada, o hero cai num fundo sólido escuro (ver
-- CursoDestaque.tsx) em vez de quebrar o layout.
alter table public.configuracoes
  add column if not exists hero_destaque_url text;
