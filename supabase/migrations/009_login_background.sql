-- Imagem de fundo da tela de login, configurável pelo admin (Admin >
-- Configurações > Fundo da Tela de Login) — campo próprio na tabela de
-- configurações gerais JÁ EXISTENTE (configuracoes, singleton id=1),
-- reaproveitada em vez de criar uma tabela nova (app_settings): ela já
-- cobre banner/hero/rodapé/whatsapp etc., é exatamente a "tabela de
-- configurações gerais do site" que a tarefa pedia.
--
-- Sem imagem cadastrada ainda (login_background_url null), a tela de login
-- cai no fallback estático /hero-destaque.png (ver app/login/page.tsx e
-- components/LoginPageClient.tsx) — a tela nunca fica sem fundo.
--
-- updated_at: pedido explícito, com default now() (aplica pra linha já
-- existente também, não só pra inserts futuros — a tabela é um singleton, a
-- linha id=1 já existe desde a migração original).
alter table public.configuracoes
  add column if not exists login_background_url text,
  add column if not exists updated_at timestamptz not null default now();
