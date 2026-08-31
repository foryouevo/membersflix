-- Campos configuráveis do rodapé da tela de login (fora do card): texto
-- "desenvolvido por", email/telefone de contato e o link dos Termos de Uso.
alter table public.configuracoes
  add column if not exists desenvolvido_por text,
  add column if not exists email_contato text,
  add column if not exists telefone_contato text,
  add column if not exists termos_uso_url text;

-- A leitura de `configuracoes` era restrita a usuários autenticados
-- (auth.role() = 'authenticated'), o que bloqueava a tela de login — o
-- rodapé precisa ser lido por visitantes ainda não logados. Nenhum campo da
-- tabela é sensível (whatsapp, banner, e agora esses 4 do rodapé são todos
-- de exibição pública por natureza), então a leitura passa a ser pública.
-- A escrita continua exclusiva de admin (config_admin_write, inalterada).
drop policy if exists config_select on public.configuracoes;
create policy config_select on public.configuracoes for select using (true);
