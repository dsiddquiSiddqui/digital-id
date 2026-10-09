create table if not exists public.platform_notification_states (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null,
  read_at timestamptz,
  acknowledged_at timestamptz,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, item_key)
);

create table if not exists public.platform_governance_settings (
  id smallint primary key default 1 check (id = 1),
  approval_required_for jsonb not null default '["owner_change","admin_role_change","bulk_disable","mfa_reset"]'::jsonb,
  notification_policy jsonb not null default '{"sla_breach":true,"billing_risk":true,"security_event":true,"daily_digest":false}'::jsonb,
  audit_retention_days integer not null default 2555 check (audit_retention_days between 90 and 3650),
  support_first_response_minutes integer not null default 240 check (support_first_response_minutes between 15 and 10080),
  support_resolution_minutes integer not null default 1440 check (support_resolution_minutes between 60 and 43200),
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_governance_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.platform_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.platform_support_tasks(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.platform_support_macros (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  visibility text not null default 'customer' check (visibility in ('customer','internal')),
  is_active boolean not null default true,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_report_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  report_type text not null check (report_type in ('portfolio','billing','security','support','audit')),
  cadence text not null check (cadence in ('daily','weekly','monthly')),
  recipients text[] not null default '{}',
  next_run_at timestamptz,
  is_active boolean not null default true,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_notification_states_owner_idx on public.platform_notification_states(owner_profile_id, updated_at desc);
create index if not exists platform_task_comments_task_idx on public.platform_task_comments(task_id, created_at desc);
create index if not exists platform_report_schedules_next_run_idx on public.platform_report_schedules(is_active, next_run_at) where is_active;

alter table public.platform_notification_states enable row level security;
alter table public.platform_governance_settings enable row level security;
alter table public.platform_task_comments enable row level security;
alter table public.platform_support_macros enable row level security;
alter table public.platform_report_schedules enable row level security;

revoke all on public.platform_notification_states from anon, authenticated;
revoke all on public.platform_governance_settings from anon, authenticated;
revoke all on public.platform_task_comments from anon, authenticated;
revoke all on public.platform_support_macros from anon, authenticated;
revoke all on public.platform_report_schedules from anon, authenticated;
