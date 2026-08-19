-- Migration 008: tenant controls, invitations, reliability settings, and login/session tracking.
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
