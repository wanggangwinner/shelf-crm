-- PostgreSQL-friendly foundation schema draft for MVP-A Task 01.
-- Future business tables must include team_id and use the authenticated session team for every query.
-- The localStorage development adapter uses UUID-compatible placeholder IDs; production IDs must be database/backend generated UUIDs.

create table users (
  id uuid primary key,
  name text not null,
  mobile text,
  email text,
  is_development_user boolean not null default false,
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key,
  name text not null,
  kind text not null check (kind in ('personal', 'team')),
  owner_user_id uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table roles (
  id uuid primary key,
  team_id uuid not null references teams(id),
  code text not null check (code in ('owner', 'sales', 'admin')),
  name text not null,
  description text not null,
  permissions jsonb not null default '[]'::jsonb
);

create table team_members (
  id uuid primary key,
  team_id uuid not null references teams(id),
  user_id uuid not null references users(id),
  role_id uuid not null references roles(id),
  display_name text not null,
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table workspace_configs (
  id uuid primary key,
  team_id uuid not null references teams(id),
  config jsonb not null,
  created_at timestamptz not null default now(),
  unique (team_id)
);

create table onboarding_progress (
  id uuid primary key,
  team_id uuid not null references teams(id),
  user_id uuid not null references users(id),
  workspace_chosen boolean not null default false,
  role_confirmed boolean not null default false,
  defaults_reviewed boolean not null default false,
  first_customer_prompted boolean not null default false,
  completed_at timestamptz,
  unique (team_id, user_id)
);

create table operation_logs (
  id uuid primary key,
  team_id uuid not null,
  actor_user_id uuid not null references users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index operation_logs_team_created_idx on operation_logs (team_id, created_at desc);
