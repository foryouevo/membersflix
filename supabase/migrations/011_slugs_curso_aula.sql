-- Slugs persistidos pra URLs amigáveis de curso/aula (/curso/[slug] e
-- /curso/[slug]/[slug-da-aula], ver app/(portal)/curso/), pedido explícito:
-- "coluna 'slug' persistida no banco... URL não muda se o título mudar
-- depois". Cada tabela ganha sua própria coluna `slug`, ÚNICA (checada
-- globalmente, não só dentro do mesmo curso — mais simples, e aulas não
-- têm curso_id direto hoje, só via modulo_id -> modulos.curso_id).
--
-- Geração automática via TRIGGER (before insert/update), não em código
-- de aplicação: qualquer curso/aula criado pelo admin (app/admin/cursos/
-- actions.ts e afins) ganha slug sozinho, sem precisar tocar nesses
-- arquivos — e o backfill dos registros já existentes (mais abaixo)
-- REAPROVEITA a mesma função/trigger, em vez de duplicar a lógica de
-- dedup ("-2", "-3"...) num script à parte.

-- unaccent: extensão padrão do Postgres/Supabase pra remover acento
-- (á->a, ç->c etc.) — "remover acentos" era um dos requisitos explícitos.
create extension if not exists unaccent;

-- slugify(valor): minúsculo, sem acento, qualquer sequência de caracteres
-- que não seja a-z/0-9 vira um único hífen (cobre espaço, "?", "!", "/",
-- qualquer outro símbolo), hífen nunca sobra na ponta. IMMUTABLE: função
-- pura, sem acesso a tabela — só transforma o texto recebido.
create or replace function public.slugify(valor text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(coalesce(valor, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

alter table public.cursos add column if not exists slug text;
alter table public.aulas add column if not exists slug text;

-- Trigger de cursos: só gera slug quando NULO/vazio (nunca sobrescreve um
-- slug já existente, mesmo que o título mude depois — URL estável, pedido
-- explícito). Dedup contra os DEMAIS cursos (id <> new.id): "-2", "-3"...
-- até achar um valor livre.
create or replace function public.gerar_slug_curso()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidato text;
  contador int := 1;
begin
  if new.slug is null or new.slug = '' then
    base := coalesce(nullif(public.slugify(new.titulo), ''), 'curso');
    candidato := base;
    while exists (select 1 from public.cursos where slug = candidato and id <> new.id) loop
      contador := contador + 1;
      candidato := base || '-' || contador;
    end loop;
    new.slug := candidato;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gerar_slug_curso on public.cursos;
create trigger trg_gerar_slug_curso
  before insert or update on public.cursos
  for each row execute procedure public.gerar_slug_curso();

-- Mesmo padrão pra aulas.
create or replace function public.gerar_slug_aula()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidato text;
  contador int := 1;
begin
  if new.slug is null or new.slug = '' then
    base := coalesce(nullif(public.slugify(new.titulo), ''), 'aula');
    candidato := base;
    while exists (select 1 from public.aulas where slug = candidato and id <> new.id) loop
      contador := contador + 1;
      candidato := base || '-' || contador;
    end loop;
    new.slug := candidato;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gerar_slug_aula on public.aulas;
create trigger trg_gerar_slug_aula
  before insert or update on public.aulas
  for each row execute procedure public.gerar_slug_aula();

-- Backfill dos registros já existentes — ordenado por created_at (quem foi
-- cadastrado primeiro "ganha" o slug sem sufixo em caso de nome repetido).
-- UPDATE ... SET titulo = titulo só pra DISPARAR o trigger acima em cada
-- linha (reaproveita a mesma função/dedup, não duplica a lógica aqui);
-- titulo não muda de valor nenhum.
do $$
declare
  r record;
begin
  for r in select id from public.cursos where slug is null order by created_at, id loop
    update public.cursos set titulo = titulo where id = r.id;
  end loop;
  for r in select id from public.aulas where slug is null order by created_at, id loop
    update public.aulas set titulo = titulo where id = r.id;
  end loop;
end $$;

-- Só depois do backfill: agora sim dá pra travar NOT NULL + UNIQUE de
-- verdade (toda linha existente já tem slug preenchido nesse ponto).
alter table public.cursos alter column slug set not null;
alter table public.cursos add constraint cursos_slug_key unique (slug);

alter table public.aulas alter column slug set not null;
alter table public.aulas add constraint aulas_slug_key unique (slug);
