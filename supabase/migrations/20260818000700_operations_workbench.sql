-- Migration 007: notifications, document renewals, import reporting, signed file controls.

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
