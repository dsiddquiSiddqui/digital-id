-- Migration 011: provider readiness, QA evidence, monitoring, report schedules, and export templates.
-- Run after all earlier migrations.

alter table public.organizations
  add column if not exists production_readiness_state jsonb not null default '{}'::jsonb,
  add column if not exists mfa_enforcement_enabled boolean not null default false;

create table if not exists public.production_provider_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  provider_area text not null,
  provider_name text not null,
  status text not null default 'not_configured' check (status in ('not_configured', 'configured', 'verified', 'failed')),
  public_config jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_provider_configs_org_area_unique unique (organization_id, provider_area)
);

drop trigger if exists production_provider_configs_set_updated_at on public.production_provider_configs;
create trigger production_provider_configs_set_updated_at
before update on public.production_provider_configs
for each row execute function public.set_updated_at();

create table if not exists public.monitoring_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  check_key text not null,
  name text not null,
  target_url text not null,
  expected_status integer not null default 200,
  status text not null default 'unknown' check (status in ('unknown', 'up', 'down', 'degraded')),
  last_checked_at timestamptz,
  last_response_ms integer,
  last_error text,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monitoring_checks_org_key_unique unique (organization_id, check_key)
);

drop trigger if exists monitoring_checks_set_updated_at on public.monitoring_checks;
create trigger monitoring_checks_set_updated_at
before update on public.monitoring_checks
for each row execute function public.set_updated_at();

create table if not exists public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  report_type text not null,
  format text not null default 'csv' check (format in ('csv', 'json', 'pdf')),
  cron_expression text not null default '0 8 * * 1',
  recipients text[] not null default '{}'::text[],
  is_enabled boolean not null default true,
  last_sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists report_schedules_set_updated_at on public.report_schedules;
create trigger report_schedules_set_updated_at
before update on public.report_schedules
for each row execute function public.set_updated_at();

create table if not exists public.export_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  template_key text not null,
  name text not null,
  export_type text not null,
  format text not null default 'pdf',
  brand_config jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint export_templates_org_key_unique unique (organization_id, template_key)
);

drop trigger if exists export_templates_set_updated_at on public.export_templates;
create trigger export_templates_set_updated_at
before update on public.export_templates
for each row execute function public.set_updated_at();

create table if not exists public.qa_review_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  category text not null,
  item_key text not null,
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'passed', 'failed', 'waived')),
  evidence text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qa_review_items_org_key_unique unique (organization_id, item_key)
);

drop trigger if exists qa_review_items_set_updated_at on public.qa_review_items;
create trigger qa_review_items_set_updated_at
before update on public.qa_review_items
for each row execute function public.set_updated_at();

create table if not exists public.app_test_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  suite_name text not null,
  status text not null default 'pending' check (status in ('pending', 'passed', 'failed')),
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_test_runs_organization_id_idx
on public.app_test_runs(organization_id);
