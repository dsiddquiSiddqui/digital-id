-- Production polish upgrade bundle for an existing Digital ID X SaaS database.
-- Legacy one-shot bundle retained for reference only; use supabase/migrations for deployments.
-- Safe to re-run: tables/columns/indexes use IF NOT EXISTS and triggers are dropped/recreated.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Source: database/add-platform-billing.sql
-- ============================================================
-- Run this on an existing SaaS database to add package metadata and make
-- new organizations default to the free package.

alter table public.organizations
alter column plan set default 'free';

alter table if exists public.organization_subscriptions
alter column plan set default 'free';

create table if not exists public.billing_plans (
  key text primary key,
  name text not null,
  monthly_price numeric,
  user_limit integer,
  staff_limit integer,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.billing_plans enable row level security;

insert into public.billing_plans (key, name, monthly_price, user_limit, staff_limit, description)
values
  ('free', 'Free', 0, 3, 25, 'For trying the platform with one small workspace.'),
  ('starter', 'Starter', 49, 8, 150, 'For small operators that need daily staff ID control.'),
  ('growth', 'Growth', 149, 25, 750, 'For multi-site teams with several managers and HR users.'),
  ('scale', 'Scale', 399, 75, 3000, 'For high-volume operations with layered access control.'),
  ('enterprise', 'Enterprise', null, null, null, 'Custom limits, controls, and rollout support.')
on conflict (key) do update set
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  user_limit = excluded.user_limit,
  staff_limit = excluded.staff_limit,
  description = excluded.description,
  is_active = true;

-- ============================================================
-- Source: database/add-organization-brand-assets.sql
-- ============================================================
-- Run this on an existing SaaS database to store tenant favicon and
-- background image URLs, and to align package limits with the app.

alter table public.organizations
add column if not exists favicon_url text,
add column if not exists background_image_url text;

insert into public.billing_plans (key, name, monthly_price, user_limit, staff_limit, description)
values
  ('free', 'Free', 0, 3, 25, 'For trying the platform with one small workspace.'),
  ('starter', 'Starter', 49, 8, 150, 'For small operators that need daily staff ID control.'),
  ('growth', 'Growth', 149, 25, 750, 'For multi-site teams with several managers and HR users.'),
  ('scale', 'Scale', 399, 75, 3000, 'For high-volume operations with layered access control.'),
  ('enterprise', 'Enterprise', null, null, null, 'Custom limits, controls, and rollout support.')
on conflict (key) do update set
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  user_limit = excluded.user_limit,
  staff_limit = excluded.staff_limit,
  description = excluded.description,
  is_active = true;

-- ============================================================
-- Source: database/add-product-improvements.sql
-- ============================================================
-- Product improvements: tenant controls, invitations, reliability settings, and login/session tracking.
-- Run this after saas-base.sql and the existing SaaS migrations.

alter table public.organizations
  add column if not exists storage_quota_mb integer not null default 1024,
  add column if not exists support_email text,
  add column if not exists support_phone text,
  add column if not exists verification_title text,
  add column if not exists role_permissions jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_state jsonb not null default '{}'::jsonb,
  add column if not exists require_2fa boolean not null default false,
  add column if not exists device_tracking_enabled boolean not null default true,
  add column if not exists rate_limit_enabled boolean not null default true,
  add column if not exists session_history_enabled boolean not null default true,
  add column if not exists billing_provider text not null default 'manual',
  add column if not exists payment_portal_url text,
  add column if not exists email_from_name text,
  add column if not exists email_from_address text,
  add column if not exists legal_terms_version text not null default '2026-06-25',
  add column if not exists legal_privacy_version text not null default '2026-06-25';

create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete set null,
  email text not null,
  full_name text,
  role text not null check (
    role in (
      'admin',
      'manager',
      'staff',
      'guard',
      'hr_manager',
      'hr',
      'operation_manager',
      'operation_team'
    )
  ),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_invitations_set_updated_at on public.user_invitations;

create trigger user_invitations_set_updated_at
before update on public.user_invitations
for each row execute function public.set_updated_at();

create index if not exists user_invitations_organization_id_idx
on public.user_invitations(organization_id);

create index if not exists user_invitations_token_idx
on public.user_invitations(token);

create table if not exists public.session_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  device_name text,
  ip_address text,
  user_agent text,
  location_label text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists session_activity_organization_id_idx
on public.session_activity(organization_id);

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  route text not null,
  identifier text,
  event_count integer not null default 1,
  window_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_organization_id_idx
on public.rate_limit_events(organization_id);

create table if not exists public.file_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  bucket text not null,
  path text not null,
  public_url text,
  content_type text,
  size_bytes bigint not null default 0,
  purpose text,
  created_at timestamptz not null default now(),
  constraint file_assets_bucket_path_unique unique (bucket, path)
);

create index if not exists file_assets_organization_id_idx
on public.file_assets(organization_id);

create table if not exists public.email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  template_key text not null,
  recipient_email text not null,
  subject text not null,
  provider text not null default 'manual',
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_delivery_logs_organization_id_idx
on public.email_delivery_logs(organization_id);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  provider text not null default 'manual',
  event_type text not null,
  provider_event_id text,
  status text not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_organization_id_idx
on public.billing_events(organization_id);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  provider text not null default 'manual',
  provider_invoice_id text,
  invoice_number text,
  status text not null default 'draft',
  amount_due numeric,
  currency text not null default 'GBP',
  hosted_invoice_url text,
  invoice_pdf_url text,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists billing_invoices_organization_id_idx
on public.billing_invoices(organization_id);

create table if not exists public.export_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  export_type text not null,
  status text not null default 'completed' check (status in ('queued', 'processing', 'completed', 'failed')),
  file_url text,
  row_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists export_requests_organization_id_idx
on public.export_requests(organization_id);

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  terms_version text not null,
  privacy_version text not null,
  accepted_ip text,
  user_agent text,
  accepted_at timestamptz not null default now()
);

create index if not exists legal_acceptances_profile_id_idx
on public.legal_acceptances(profile_id);

create table if not exists public.platform_access_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  super_admin_profile_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'active' check (status in ('active', 'ended', 'expired')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists platform_access_sessions_organization_id_idx
on public.platform_access_sessions(organization_id);

-- ============================================================
-- Source: database/add-operations-workbench.sql
-- ============================================================
-- Operations workbench: notifications, document renewals, import reporting, signed file controls.

alter table public.file_assets
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private')),
  add column if not exists expires_at timestamptz;

alter table public.staff_documents
  add column if not exists file_asset_id uuid references public.file_assets(id) on delete set null,
  add column if not exists approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'critical')),
  action_url text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_organization_id_idx
on public.notifications(organization_id);

create index if not exists notifications_profile_id_idx
on public.notifications(profile_id);

create table if not exists public.staff_document_renewal_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  document_id uuid references public.staff_documents(id) on delete set null,
  document_type_id uuid references public.document_types(id) on delete set null,
  submitted_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  file_url text,
  document_number text,
  issue_date date,
  expiry_date date,
  notes text,
  review_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists staff_document_renewal_requests_organization_id_idx
on public.staff_document_renewal_requests(organization_id);

-- ============================================================
-- Source: database/add-admin-growth-tools.sql
-- ============================================================
-- Admin growth tools: ID card designer, bulk actions, custom domains, workflow automations, onboarding wizard.

alter table public.organizations
  add column if not exists id_card_template jsonb not null default '{
    "layout": "classic",
    "orientation": "portrait",
    "primaryColor": "#081a33",
    "accentColor": "#0094e0",
    "showLogo": true,
    "showQr": true,
    "showSia": true,
    "showIssueDate": true,
    "showExpiryDate": true,
    "footerText": "Verified Digital Identity",
    "headerText": "Digital Staff ID"
  }'::jsonb,
  add column if not exists onboarding_wizard_state jsonb not null default '{}'::jsonb;

create table if not exists public.organization_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  domain text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed', 'disabled')),
  purpose text not null default 'login' check (purpose in ('login', 'verification', 'both')),
  verification_token text not null default encode(gen_random_bytes(18), 'hex'),
  dns_target text not null default 'digitalidx.app',
  last_checked_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_domains_domain_unique unique (domain)
);

drop trigger if exists organization_domains_set_updated_at on public.organization_domains;
create trigger organization_domains_set_updated_at
before update on public.organization_domains
for each row execute function public.set_updated_at();

create index if not exists organization_domains_organization_id_idx
on public.organization_domains(organization_id);

create table if not exists public.workflow_automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null check (trigger_type in ('document_expiring', 'staff_status_changed', 'id_expired', 'invite_pending')),
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  last_run_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists workflow_automation_rules_set_updated_at on public.workflow_automation_rules;
create trigger workflow_automation_rules_set_updated_at
before update on public.workflow_automation_rules
for each row execute function public.set_updated_at();

create index if not exists workflow_automation_rules_organization_id_idx
on public.workflow_automation_rules(organization_id);

create table if not exists public.workflow_automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  rule_id uuid references public.workflow_automation_rules(id) on delete set null,
  status text not null default 'completed' check (status in ('completed', 'failed', 'skipped')),
  matched_count integer not null default 0,
  action_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists workflow_automation_runs_rule_id_idx
on public.workflow_automation_runs(rule_id);

create table if not exists public.bulk_action_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  action_type text not null,
  target_type text not null default 'staff',
  target_count integer not null default 0,
  success_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'completed' check (status in ('queued', 'processing', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists bulk_action_batches_organization_id_idx
on public.bulk_action_batches(organization_id);

-- ============================================================
-- Source: database/add-enterprise-readiness-suite.sql
-- ============================================================
-- Enterprise readiness suite: verification, rollback, automation testing, and operational health.
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

-- ============================================================
-- Source: database/add-polish-suite.sql
-- ============================================================
-- Polish suite: email templates, launch checklist notes, and UI readiness state.
-- Run after enterprise readiness migrations.

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  template_key text not null,
  name text not null,
  subject text not null,
  preview_text text,
  body_html text not null,
  body_text text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_templates_org_key_unique unique (organization_id, template_key)
);

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();

create index if not exists email_templates_organization_id_idx
on public.email_templates(organization_id);

alter table public.organizations
  add column if not exists launch_checklist_state jsonb not null default '{}'::jsonb,
  add column if not exists ui_polish_state jsonb not null default '{"mobile_reviewed":false,"accessibility_reviewed":false,"microcopy_reviewed":false,"performance_reviewed":false}'::jsonb;

-- ============================================================
-- Source: database/add-scheduled-job-ops.sql
-- ============================================================
-- Scheduled job operations: configured jobs, run history, and failure visibility.
-- Run after the production polish migrations.

create table if not exists public.scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null unique,
  name text not null,
  description text,
  endpoint text not null,
  cron_expression text not null,
  provider text not null default 'vercel',
  is_enabled boolean not null default true,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_status text not null default 'never' check (last_status in ('never', 'running', 'success', 'failed', 'skipped')),
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists scheduled_jobs_set_updated_at on public.scheduled_jobs;
create trigger scheduled_jobs_set_updated_at
before update on public.scheduled_jobs
for each row execute function public.set_updated_at();

create table if not exists public.scheduled_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.scheduled_jobs(id) on delete cascade,
  job_key text not null,
  status text not null default 'running' check (status in ('running', 'success', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists scheduled_job_runs_job_key_idx
on public.scheduled_job_runs(job_key);

create index if not exists scheduled_job_runs_started_at_idx
on public.scheduled_job_runs(started_at desc);

insert into public.scheduled_jobs (job_key, name, description, endpoint, cron_expression, provider)
values
  ('expiry_reminders', 'Expiry reminders', 'Find expiring staff documents and send notifications or emails.', '/api/cron/expiry-reminders', '0 7 * * *', 'vercel'),
  ('automation_runner', 'Automation runner', 'Run active workflow automation rules.', '/api/cron/automation-runner', '*/30 * * * *', 'vercel'),
  ('report_delivery', 'Scheduled report delivery', 'Send configured report schedules to selected recipients.', '/api/cron/report-delivery', '0 8 * * 1', 'vercel')
on conflict (job_key) do update
set
  name = excluded.name,
  description = excluded.description,
  endpoint = excluded.endpoint,
  cron_expression = excluded.cron_expression,
  provider = excluded.provider;

-- ============================================================
-- Source: database/add-production-completion-suite.sql
-- ============================================================
-- Production completion suite: provider readiness, QA evidence, monitoring, report schedules, and export templates.
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

-- ============================================================
-- Source: database/add-support-tickets.sql
-- ============================================================
-- Support tickets for in-app documentation and issue tracking.
-- Run on an existing SaaS database.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  assigned_to_profile_id uuid references public.profiles(id) on delete set null,
  ticket_number bigint generated always as identity,
  subject text not null,
  message text not null,
  category text not null default 'general',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
  response_summary text,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

create index if not exists support_tickets_organization_id_idx
on public.support_tickets(organization_id);

create index if not exists support_tickets_status_idx
on public.support_tickets(status);
