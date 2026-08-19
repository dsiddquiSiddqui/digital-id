-- Migration 006: verification, rollback, automation testing, and operational health.
-- Run after add-product-improvements.sql, add-operations-workbench.sql, and add-admin-growth-tools.sql.

alter table public.organizations
  add column if not exists session_timeout_minutes integer not null default 480,
  add column if not exists ip_allowlist text[] not null default '{}'::text[],
  add column if not exists backup_policy jsonb not null default '{"frequency":"weekly","retention_days":30,"last_export_at":null}'::jsonb,
  add column if not exists compliance_policy jsonb not null default '{"require_document_approval":true,"allow_staff_self_service":true,"allow_staff_id_download":false}'::jsonb;

alter table public.organization_domains
  add column if not exists dns_status text not null default 'unchecked' check (dns_status in ('unchecked', 'verified', 'failed')),
  add column if not exists ssl_status text not null default 'pending' check (ssl_status in ('pending', 'active', 'failed')),
  add column if not exists cname_ok boolean not null default false,
  add column if not exists txt_ok boolean not null default false,
  add column if not exists last_checked_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists last_error text;

alter table public.bulk_action_batches
  add column if not exists approval_status text not null default 'not_required' check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rollback_until timestamptz,
  add column if not exists rolled_back_at timestamptz,
  add column if not exists rolled_back_by uuid references public.profiles(id) on delete set null;

alter table public.bulk_action_batches
  drop constraint if exists bulk_action_batches_status_check;

alter table public.bulk_action_batches
  add constraint bulk_action_batches_status_check
  check (status in ('queued', 'processing', 'pending_approval', 'completed', 'failed', 'rolled_back'));

alter table public.workflow_automation_rules
  add column if not exists template_key text,
  add column if not exists delay_minutes integer not null default 0,
  add column if not exists last_tested_at timestamptz;

alter table public.workflow_automation_runs
  drop constraint if exists workflow_automation_runs_status_check;

alter table public.workflow_automation_runs
  add constraint workflow_automation_runs_status_check
  check (status in ('completed', 'failed', 'skipped', 'test_completed'));

create table if not exists public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  source_type text not null default 'manual',
  source_id uuid,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists admin_tasks_set_updated_at on public.admin_tasks;
create trigger admin_tasks_set_updated_at
before update on public.admin_tasks
for each row execute function public.set_updated_at();

create index if not exists admin_tasks_organization_id_idx
on public.admin_tasks(organization_id);

create table if not exists public.system_health_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'critical')),
  title text not null,
  body text,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists system_health_events_organization_id_idx
on public.system_health_events(organization_id);

create table if not exists public.id_card_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade,
  exported_by uuid references public.profiles(id) on delete set null,
  export_type text not null default 'pdf',
  status text not null default 'completed' check (status in ('queued', 'processing', 'completed', 'failed')),
  file_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists id_card_exports_organization_id_idx
on public.id_card_exports(organization_id);
