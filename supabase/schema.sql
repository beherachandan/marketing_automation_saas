-- Conduct — Marketing Automation SaaS
-- Supabase schema. Run via `supabase db push` or paste into SQL editor.
-- Target: Postgres 15+. Assumes the default `auth.users` table exists.

-- =========================================================================
-- Extensions
-- =========================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================================
-- Enums
-- =========================================================================
do $$ begin
  create type workspace_status as enum ('draft', 'launched', 'paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type integration_provider as enum (
    'slack', 'semrush', 'dataforseo', 'tavily', 'webflow', 'wordpress',
    'contentful', 'sanity', 'gemini', 'anthropic'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type integration_status as enum ('connected', 'stub', 'none', 'error');
exception when duplicate_object then null; end $$;

do $$ begin
  create type run_kind as enum ('audit', 'draft', 'trend', 'eod_memory', 'citation_audit', 'rubric_recal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type run_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

-- =========================================================================
-- profiles (1:1 with auth.users, holds app-level user fields)
-- =========================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (lower(email));

-- =========================================================================
-- workspaces
-- =========================================================================
create table if not exists public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  status workspace_status not null default 'draft',
  onboarding_step int not null default 1 check (onboarding_step between 1 and 8),
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_owner_idx on public.workspaces (owner_id);

-- Membership table (future multi-user; owner row seeded via trigger)
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- =========================================================================
-- tenant_configs (one row per step per workspace)
-- =========================================================================
create table if not exists public.tenant_configs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  step int not null check (step between 1 and 8),
  data jsonb not null,
  generated_files jsonb,  -- { "IDENTITY.md": "…", ... } snapshot at save time
  updated_at timestamptz not null default now(),
  unique (workspace_id, step)
);

create index if not exists tenant_configs_workspace_idx on public.tenant_configs (workspace_id);

-- =========================================================================
-- integrations (provider credentials, encrypted at column level)
-- =========================================================================
create table if not exists public.integrations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider integration_provider not null,
  status integration_status not null default 'none',
  config jsonb not null default '{}'::jsonb,        -- non-secret metadata (siteId, channelId, etc.)
  credentials_encrypted bytea,                       -- pgp_sym_encrypt output of JSON blob
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

create index if not exists integrations_workspace_idx on public.integrations (workspace_id);

-- =========================================================================
-- slack_installs (bot + user tokens for Slack workspaces)
-- =========================================================================
create table if not exists public.slack_installs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  team_id text not null,
  team_name text,
  bot_user_id text,
  bot_token_encrypted bytea not null,               -- pgp_sym_encrypt
  user_id text,                                      -- slack user who installed
  app_id text,
  scope text,
  channel_id text,                                   -- primary channel for posts
  channel_name text,
  installed_at timestamptz not null default now(),
  uninstalled_at timestamptz,
  unique (workspace_id, team_id)
);

create index if not exists slack_installs_team_idx on public.slack_installs (team_id);

-- =========================================================================
-- runs (audit / draft / cron run history)
-- =========================================================================
create table if not exists public.runs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind run_kind not null,
  status run_status not null default 'queued',
  input jsonb,                                       -- { url: "..." } or { topic: "..." }
  output jsonb,                                      -- model output, score, draft, etc.
  slack_thread_ts text,                              -- thread the run posts back to
  slack_channel_id text,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists runs_workspace_created_idx on public.runs (workspace_id, created_at desc);
create index if not exists runs_status_idx on public.runs (status) where status in ('queued', 'running');

-- =========================================================================
-- Helpers: updated_at trigger
-- =========================================================================
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_workspaces_updated on public.workspaces;
create trigger trg_workspaces_updated before update on public.workspaces
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_tenant_configs_updated on public.tenant_configs;
create trigger trg_tenant_configs_updated before update on public.tenant_configs
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_integrations_updated on public.integrations;
create trigger trg_integrations_updated before update on public.integrations
  for each row execute function public.touch_updated_at();

-- =========================================================================
-- Helpers: workspace membership check (used in RLS)
-- =========================================================================
create or replace function public.is_workspace_member(ws uuid) returns boolean as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$ language sql stable security definer;

-- Auto-seed owner as member on workspace insert
create or replace function public.seed_workspace_owner() returns trigger as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_workspace_owner on public.workspaces;
create trigger trg_workspace_owner after insert on public.workspaces
  for each row execute function public.seed_workspace_owner();

-- =========================================================================
-- Row-Level Security
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.tenant_configs enable row level security;
alter table public.integrations enable row level security;
alter table public.slack_installs enable row level security;
alter table public.runs enable row level security;

-- profiles: user sees / edits only their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- workspaces: members can read; owners can write
drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member" on public.workspaces
  for select using (public.is_workspace_member(id));

drop policy if exists "workspaces_insert_owner" on public.workspaces;
create policy "workspaces_insert_owner" on public.workspaces
  for insert with check (auth.uid() = owner_id);

drop policy if exists "workspaces_update_owner" on public.workspaces;
create policy "workspaces_update_owner" on public.workspaces
  for update using (auth.uid() = owner_id);

-- workspace_members
drop policy if exists "members_select" on public.workspace_members;
create policy "members_select" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists "members_insert_owner" on public.workspace_members;
create policy "members_insert_owner" on public.workspace_members
  for insert with check (
    exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

-- tenant_configs: member read/write
drop policy if exists "configs_all_member" on public.tenant_configs;
create policy "configs_all_member" on public.tenant_configs
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- integrations: member read/write (but secrets only via service role)
drop policy if exists "integrations_all_member" on public.integrations;
create policy "integrations_all_member" on public.integrations
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- slack_installs: member read, service role writes (bot token sensitive)
drop policy if exists "slack_select_member" on public.slack_installs;
create policy "slack_select_member" on public.slack_installs
  for select using (public.is_workspace_member(workspace_id));

-- runs: member read/write
drop policy if exists "runs_all_member" on public.runs;
create policy "runs_all_member" on public.runs
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- =========================================================================
-- Seed: auto-create profile row when auth.users inserts
-- =========================================================================
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
