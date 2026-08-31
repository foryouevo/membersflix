-- ============================================================================
-- MEMBERSFLIX — SCHEMA SUPABASE
-- Rode este arquivo inteiro no SQL Editor do Supabase (projeto novo).
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_tipo as enum ('admin', 'aluno');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_pagamento as enum ('pendente', 'pago');
exception when duplicate_object then null; end $$;

do $$ begin
  create type video_origem as enum ('upload', 'url_externa', 'drive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vitrine_secao_tipo as enum ('continue_watching', 'dinamica', 'custom');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  avatar_url text,
  tipo user_tipo not null default 'aluno',
  status_pagamento status_pagamento not null default 'pendente',
  liberado_em timestamptz not null default now(),
  bloqueado boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  categoria_id uuid references public.categorias(id) on delete set null,
  capa_url text,
  thumbnail_url text,
  instrutor_nome text,
  instrutor_bio text,
  instrutor_avatar_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  mensagem_whatsapp text not null default 'Olá! Quero liberar meu acesso ao curso {curso}.',
  drive_folder_id text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.modulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos(id) on delete cascade,
  titulo text not null,
  capa_url text,
  ordem int not null default 0,
  drive_folder_id text,
  -- Hierarquia de 2 níveis: um módulo "pai" (guarda-chuva, sem aula própria)
  -- pode agrupar vários módulos "filho" (que têm aulas de verdade) — ver
  -- migrations/007_modulo_pai.sql pro contexto completo.
  modulo_pai_id uuid references public.modulos(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists modulos_modulo_pai_id_idx on public.modulos (modulo_pai_id);

create table if not exists public.aulas (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.modulos(id) on delete cascade,
  titulo text not null,
  descricao text,
  video_origem video_origem not null default 'upload',
  video_url text,
  thumbnail_url text,
  duracao_segundos int not null default 0,
  drive_file_id text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas(id) on delete cascade,
  nome text not null,
  url text not null,
  tipo text,
  tamanho_bytes bigint,
  drive_file_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.acessos_curso (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete cascade,
  bloqueado boolean not null default false,
  liberado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (aluno_id, curso_id)
);

create table if not exists public.progresso_aulas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles(id) on delete cascade,
  aula_id uuid not null references public.aulas(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete cascade,
  concluida boolean not null default false,
  segundo_atual int not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (aluno_id, aula_id)
);

create table if not exists public.configuracoes (
  id int primary key default 1,
  numero_whatsapp text,
  banner_plataforma_url text,
  constraint configuracoes_singleton check (id = 1)
);
insert into public.configuracoes (id, numero_whatsapp, banner_plataforma_url)
  values (1, null, null) on conflict (id) do nothing;

-- Bucket público para assets da plataforma (banner institucional, etc.).
-- Upload é feito só via server action com service role (bypassa RLS do storage),
-- e leitura é pública (bucket public = true), então nenhuma policy extra é necessária.
insert into storage.buckets (id, name, public)
  values ('platform-assets', 'platform-assets', true)
  on conflict (id) do nothing;

create table if not exists public.vitrine_secoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo vitrine_secao_tipo not null default 'custom',
  categoria_id uuid references public.categorias(id) on delete set null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.vitrine_secao_cursos (
  id uuid primary key default gen_random_uuid(),
  secao_id uuid not null references public.vitrine_secoes(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete cascade,
  ordem int not null default 0,
  unique (secao_id, curso_id)
);

-- ---------------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = uid and tipo = 'admin');
$$;

create or replace function public.tem_acesso_curso(uid uuid, cid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.acessos_curso
    where aluno_id = uid and curso_id = cid and bloqueado = false
  );
$$;

-- ---------------------------------------------------------------------------
-- TRIGGER: cria profile ao registrar usuário no Supabase Auth
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, telefone, tipo, status_pagamento, liberado_em)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'telefone',
    coalesce((new.raw_user_meta_data->>'tipo')::user_tipo, 'aluno'),
    coalesce((new.raw_user_meta_data->>'status_pagamento')::status_pagamento, 'pendente'),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- REGRA 1: auto-bloqueio de alunos pendentes após 30min sem confirmação de pagamento
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- REGRA 2: durante os 30min de trial (status_pagamento = 'pendente' e ainda
-- não bloqueado pela regra 1), só o módulo de menor `ordem` do curso fica
-- acessível — quem já pagou (ou é admin) tem acesso total, sem restrição.
-- ---------------------------------------------------------------------------
create or replace function public.pode_acessar_modulo(uid uuid, mid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  -- Um módulo "pai" (guarda-chuva, sem aula própria — ver modulo_pai_id)
  -- nunca conta como candidato ao "Módulo 1 liberado no trial": o menor
  -- `ordem` é escolhido só entre módulos-FOLHA (que não são pai de ninguém),
  -- senão o aluno em trial podia acabar "liberado" pra um módulo vazio.
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

-- Agendamento via pg_cron (roda a cada 5 minutos). Caso pg_cron não esteja
-- disponível no seu projeto, use o endpoint /api/cron/check-pagamentos com
-- o Vercel Cron configurado em vercel.json como alternativa equivalente.
select cron.schedule(
  'bloquear-pagamentos-pendentes',
  '*/5 * * * *',
  $$select public.bloquear_pagamentos_pendentes();$$
) where not exists (
  select 1 from cron.job where jobname = 'bloquear-pagamentos-pendentes'
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categorias enable row level security;
alter table public.cursos enable row level security;
alter table public.modulos enable row level security;
alter table public.aulas enable row level security;
alter table public.documentos enable row level security;
alter table public.acessos_curso enable row level security;
alter table public.progresso_aulas enable row level security;
alter table public.configuracoes enable row level security;
alter table public.vitrine_secoes enable row level security;
alter table public.vitrine_secao_cursos enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

revoke update on public.profiles from authenticated;
grant update (nome, telefone, avatar_url) on public.profiles to authenticated;

-- categorias (leitura livre p/ autenticados, escrita só admin)
drop policy if exists categorias_select on public.categorias;
create policy categorias_select on public.categorias for select using (auth.role() = 'authenticated');
drop policy if exists categorias_admin_write on public.categorias;
create policy categorias_admin_write on public.categorias for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- cursos: vitrine mostra todos os cursos ativos (mesmo sem acesso -> grayscale no client)
drop policy if exists cursos_select on public.cursos;
create policy cursos_select on public.cursos for select
  using (status = 'active' or public.is_admin(auth.uid()));
drop policy if exists cursos_admin_write on public.cursos;
create policy cursos_admin_write on public.cursos for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- modulos / aulas / documentos: só quem tem acesso liberado ao curso, ou admin
drop policy if exists modulos_select on public.modulos;
create policy modulos_select on public.modulos for select
  using (public.is_admin(auth.uid()) or public.tem_acesso_curso(auth.uid(), curso_id));
drop policy if exists modulos_admin_write on public.modulos;
create policy modulos_admin_write on public.modulos for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

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
drop policy if exists aulas_admin_write on public.aulas;
create policy aulas_admin_write on public.aulas for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

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
drop policy if exists documentos_admin_write on public.documentos;
create policy documentos_admin_write on public.documentos for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- acessos_curso
drop policy if exists acessos_select on public.acessos_curso;
create policy acessos_select on public.acessos_curso for select
  using (aluno_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists acessos_admin_write on public.acessos_curso;
create policy acessos_admin_write on public.acessos_curso for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- progresso_aulas: aluno controla o próprio progresso
drop policy if exists progresso_own on public.progresso_aulas;
create policy progresso_own on public.progresso_aulas for all
  using (aluno_id = auth.uid() or public.is_admin(auth.uid()))
  with check (aluno_id = auth.uid() or public.is_admin(auth.uid()));

-- configuracoes: leitura para autenticados (precisa do numero do whatsapp), escrita só admin
drop policy if exists config_select on public.configuracoes;
create policy config_select on public.configuracoes for select using (auth.role() = 'authenticated');
drop policy if exists config_admin_write on public.configuracoes;
create policy config_admin_write on public.configuracoes for update
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- vitrine
drop policy if exists vitrine_secoes_select on public.vitrine_secoes;
create policy vitrine_secoes_select on public.vitrine_secoes for select using (auth.role() = 'authenticated');
drop policy if exists vitrine_secoes_admin_write on public.vitrine_secoes;
create policy vitrine_secoes_admin_write on public.vitrine_secoes for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists vitrine_secao_cursos_select on public.vitrine_secao_cursos;
create policy vitrine_secao_cursos_select on public.vitrine_secao_cursos for select using (auth.role() = 'authenticated');
drop policy if exists vitrine_secao_cursos_admin_write on public.vitrine_secao_cursos;
create policy vitrine_secao_cursos_admin_write on public.vitrine_secao_cursos for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- SEED mínimo (opcional): primeiro admin deve ser criado via signUp + update manual:
-- update public.profiles set tipo = 'admin' where email = 'seu-email@dominio.com';
-- ---------------------------------------------------------------------------
