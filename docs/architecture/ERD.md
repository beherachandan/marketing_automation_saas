# Entity Relationship Diagram

> All tables, relationships, cardinalities, and key columns.
> Tables prefixed `*` are new (not yet in schema.sql).

---

## Full ERD

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              IDENTITY & ACCESS                                    │
│                                                                                    │
│  ┌─────────────────┐   1:1   ┌──────────────────┐                                │
│  │  auth.users     │ ──────► │  profiles        │                                │
│  │  (Supabase)     │         │  id (uuid) PK    │                                │
│  │  id (uuid) PK   │         │  user_id FK      │                                │
│  │  email          │         │  full_name       │                                │
│  │  ...            │         │  avatar_url      │                                │
│  └─────────────────┘         └────────┬─────────┘                                │
│                                       │ M                                         │
│                                       │ workspace_members                         │
│                                       │ (join table)                              │
│                                       │ N                                         │
│                              ┌────────▼─────────────────────────────┐            │
│                              │  workspaces                          │            │
│                              │  id (uuid) PK                        │            │
│                              │  owner_id FK → profiles.id           │            │
│                              │  name          text                  │            │
│                              │  status        draft | launched      │            │
│                              │  scanned_hints jsonb          *fix*  │            │
│                              │  created_at    timestamptz           │            │
│                              └──────────────────┬───────────────────┘            │
│                                                 │ 1                               │
└─────────────────────────────────────────────────┼────────────────────────────────┘
                                                  │
          ┌──────────────────┬───────────────────┼───────────────────┬─────────────┐
          │ N                │ N                 │ N                 │ N           │ N
          ▼                  ▼                   ▼                   ▼             ▼

┌──────────────────┐ ┌──────────────────┐ ┌────────────────────┐ ┌────────────────────────────┐
│  tenant_configs  │ │  scanned_hints   │ │  slack_installs    │ │  integrations              │
│  (onboarding)    │ │  (site scan)     │ │  (Slack OAuth)     │ │  (3rd party creds)         │
│                  │ │                  │ │                    │ │                            │
│  id        PK    │ │  id        PK    │ │  id          PK    │ │  id          PK            │
│  workspace_id FK │ │  workspace_id FK │ │  workspace_id FK   │ │  workspace_id FK           │
│  step      1–8   │ │  hints     jsonb │ │  team_id     text  │ │  provider    text          │
│  data      jsonb │ │  scanned_at      │ │  bot_token   bytea │ │  credentials bytea (enc)   │
│  generated_files │ │                  │ │  channel_id  text  │ │  status      active|paused │
│  jsonb           │ │                  │ │  team_name   text  │ │  config      jsonb         │
│  created_at      │ │                  │ │  uninstalled_at    │ │  connected_at              │
│  updated_at      │ │                  │ │  installed_at      │ │                            │
└──────────────────┘ └──────────────────┘ └────────────────────┘ └────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────────┐
│                           AGENT CAPABILITY LAYER                  *new*          │
│                                                                                    │
│  ┌───────────────────────────────────┐    ┌──────────────────────────────────┐   │
│  │  agent_type_registry              │    │  workspace_agent_capabilities    │   │
│  │  (global catalog, no workspace_id)│    │  PK: (workspace_id, agent_type)  │   │
│  │                                   │    │                                  │   │
│  │  agent_type    text  PK           │◄───│  workspace_id  FK                │   │
│  │  label         text               │    │  agent_type    FK                │   │
│  │  description   text               │    │  status        pending           │   │
│  │  applicable_streams  text[]       │    │                active            │   │
│  │  default_config      jsonb        │    │                paused            │   │
│  │  is_ga         bool  default false│    │                error             │   │
│  │  introduced_at timestamptz        │    │  config        jsonb             │   │
│  └───────────────────────────────────┘    │  provisioned_at                  │   │
│                                           │  activated_at                    │   │
│  Values:                                  └──────────────────────────────────┘   │
│   'keyword-research'  streams: [SEO, AEO/GEO]                                    │
│   'trend-discovery'   streams: [SEO, AEO/GEO]                                    │
│   'citation-audit'    streams: [AEO/GEO]                                          │
│   'content-rubric'    streams: [AEO/GEO]                                          │
│   'ai-draft'          streams: [AEO/GEO]                                          │
│   'brand-voice'       streams: [AEO/GEO]                                          │
│   'ad-copy'           streams: [Paid]                                             │
│   'lp-audit'          streams: [Paid]                                             │
│   'on-page-audit'     streams: [SEO]                                              │
│   'sitemap-audit'     streams: [SEO]                                              │
└──────────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────────┐
│                           SKILL CONFIG LAYER                      *new*          │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │  workspace_skill_configs                                                  │    │
│  │  PK: (workspace_id, skill_id)                                            │    │
│  │                                                                           │    │
│  │  workspace_id       uuid  FK → workspaces.id                             │    │
│  │  skill_id           text  FK → agent_type_registry.agent_type            │    │
│  │  org_overrides      jsonb  — structured fields + raw_instruction         │    │
│  │  effective_config   jsonb  — cached merge of base + org_overrides        │    │
│  │  version            int   default 0  — optimistic lock                   │    │
│  │  last_modified_at   timestamptz                                           │    │
│  │  last_modified_via  text   'slack' | 'dashboard' | 'onboarding' |        │    │
│  │                            'cron_calibration'                             │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
│                                │ 1                                                │
│                                │ has many                                         │
│                                ▼ N                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │  workspace_skill_config_history   (append-only, never updated/deleted)   │    │
│  │                                                                           │    │
│  │  id             uuid  PK                                                  │    │
│  │  workspace_id   uuid  FK                                                  │    │
│  │  skill_id       text                                                      │    │
│  │  changed_at     timestamptz                                               │    │
│  │  changed_by     uuid  FK → profiles.id  (null if cron)                   │    │
│  │  source         text  'slack' | 'dashboard' | 'onboarding' |             │    │
│  │                       'cron_calibration' | 'undo'                        │    │
│  │  delta          jsonb  — only what changed                                │    │
│  │  previous_value jsonb  — full org_overrides before change                │    │
│  │  new_value      jsonb  — full org_overrides after change                 │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │  workspace_skill_calibrations   (pending cron proposals)                 │    │
│  │  PK: (workspace_id, skill_id)   — one active proposal at a time          │    │
│  │                                                                           │    │
│  │  workspace_id    uuid  FK                                                 │    │
│  │  skill_id        text                                                     │    │
│  │  proposed_delta  jsonb  — what the cron wants to change                  │    │
│  │  rationale       text   — human-readable explanation sent to Slack        │    │
│  │  status          text   'pending' | 'applied' | 'rejected' | 'expired'   │    │
│  │  proposed_at     timestamptz                                              │    │
│  │  expires_at      timestamptz  default now() + interval '7 days'          │    │
│  │  resolved_at     timestamptz                                              │    │
│  │  resolved_by     text   'user' | 'expiry'                                │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────────┐
│                           EXECUTION LAYER                         *new*          │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │  workflow_runs   (cron-initiated, one row per org per run)               │    │
│  │                                                                           │    │
│  │  id              uuid  PK                                                 │    │
│  │  workspace_id    uuid  FK → workspaces.id                                │    │
│  │  kind            enum  weekly_discovery | monthly_citation |              │    │
│  │                        monthly_rubric | eod_memory | paid_amplifier      │    │
│  │  status          enum  queued | running | succeeded | failed | cancelled  │    │
│  │  inngest_run_id  text  — correlation ID for Inngest dashboard             │    │
│  │  input           jsonb                                                    │    │
│  │  output          jsonb                                                    │    │
│  │  error           text                                                     │    │
│  │  started_at      timestamptz                                              │    │
│  │  finished_at     timestamptz                                              │    │
│  │  created_at      timestamptz                                              │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │  runs   (on-demand Slack commands: audit, draft)    existing              │    │
│  │                                                                           │    │
│  │  id              uuid  PK                                                 │    │
│  │  workspace_id    uuid  FK                                                 │    │
│  │  type            text  'audit' | 'draft'                                  │    │
│  │  status          text                                                     │    │
│  │  result          jsonb                                                    │    │
│  │  created_at      timestamptz                                              │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Relationship summary

| From | To | Cardinality | Via |
|---|---|---|---|
| `auth.users` | `profiles` | 1:1 | `profiles.user_id` |
| `profiles` | `workspaces` | M:N | `workspace_members` |
| `workspaces` | `tenant_configs` | 1:N | `workspace_id` |
| `workspaces` | `slack_installs` | 1:N | `workspace_id` |
| `workspaces` | `integrations` | 1:N | `workspace_id` |
| `workspaces` | `workspace_agent_capabilities` | 1:N | `workspace_id` |
| `workspaces` | `workspace_skill_configs` | 1:N | `workspace_id` |
| `workspaces` | `workflow_runs` | 1:N | `workspace_id` |
| `workspace_skill_configs` | `workspace_skill_config_history` | 1:N | `(workspace_id, skill_id)` |
| `workspace_skill_configs` | `workspace_skill_calibrations` | 1:1 active | `(workspace_id, skill_id)` |
| `agent_type_registry` | `workspace_agent_capabilities` | 1:N | `agent_type` |

---

## RLS policy pattern

Every workspace-scoped table uses the same policy:

```sql
-- Helper function (defined once)
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspace_members
    where user_id = auth.uid()
      and workspace_id = p_workspace_id
  )
$$;

-- Applied to every table
alter table public.<table> enable row level security;

create policy "<table>_member_all" on public.<table>
  for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
```

**Exceptions:**
- `agent_type_registry` — global catalog, no `workspace_id`. All authenticated users can `SELECT`. Only `service_role` can `INSERT/UPDATE`.
- `workspace_skill_config_history` — `INSERT` allowed for members, `UPDATE/DELETE` blocked for everyone (append-only enforced via policy).

---

## Indexes

```sql
-- Hot path: loading all skill configs for an org
create index on workspace_skill_configs (workspace_id);

-- Hot path: cron fan-out query
create index on workspace_agent_capabilities (agent_type, status)
  where status = 'active';

-- Hot path: Slack routing
create index on slack_installs (team_id)
  where uninstalled_at is null;

-- Hot path: run history dashboard
create index on workflow_runs (workspace_id, kind, created_at desc);

-- Pending calibration lookup
create index on workspace_skill_calibrations (workspace_id, status)
  where status = 'pending';

-- History lookup for /history Slack command
create index on workspace_skill_config_history (workspace_id, skill_id, changed_at desc);
```

---

## Atomic context read (Postgres function)

Prevents mixed-state context assembly from multi-query reads:

```sql
create or replace function public.get_tenant_context(p_workspace_id uuid)
returns jsonb
language sql
security definer
stable
as $$
  select jsonb_build_object(
    'workspace',    (
                      select row_to_json(w)
                      from public.workspaces w
                      where w.id = p_workspace_id
                    ),
    'config',       (
                      select jsonb_object_agg(step, data)
                      from public.tenant_configs
                      where workspace_id = p_workspace_id
                    ),
    'skill_configs',(
                      select jsonb_object_agg(skill_id, jsonb_build_object(
                        'org_overrides',    org_overrides,
                        'effective_config', effective_config,
                        'version',          version
                      ))
                      from public.workspace_skill_configs
                      where workspace_id = p_workspace_id
                    ),
    'integrations', (
                      select jsonb_object_agg(provider, jsonb_build_object(
                        'status', status,
                        'config', config
                      ))
                      from public.integrations
                      where workspace_id = p_workspace_id
                    ),
    'capabilities', (
                      select jsonb_agg(jsonb_build_object(
                        'agent_type', agent_type,
                        'status',     status,
                        'config',     config
                      ))
                      from public.workspace_agent_capabilities
                      where workspace_id = p_workspace_id
                        and status = 'active'
                    ),
    'slack',        (
                      select row_to_json(s)
                      from public.slack_installs s
                      where s.workspace_id = p_workspace_id
                        and s.uninstalled_at is null
                      limit 1
                    )
  )
$$;
```

Called from `lib/agents/context.ts` as a single RPC:
```ts
const { data } = await supabase.rpc('get_tenant_context', { p_workspace_id: workspaceId })
```
