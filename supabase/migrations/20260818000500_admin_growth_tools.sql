-- Migration 005: ID card designer, bulk actions, custom domains, workflow automations, onboarding wizard.

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
  dns_target text not null default 'security-id.app',
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
