-- Migration 001: SaaS base schema for a fresh Supabase database.
-- Run this once in the Supabase SQL editor before using the app.

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

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'trialing', 'paused', 'suspended', 'archived')),
  plan text not null default 'free',
  theme_key text not null default 'command-blue',
  logo_url text,
  favicon_url text,
  background_image_url text,
  primary_color text not null default '#0f6bff',
  accent_color text not null default '#10b981',
  surface_color text not null default '#f8fafc',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  role text not null check (
    role in (
      'super_admin',
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
  full_name text not null,
  email text unique,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  employee_code text not null,
  full_name text not null,
  photo_url text,
  phone text,
  email text,
  company_name text not null default 'Security Team',
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended', 'revoked', 'expired', 'archived')),
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  parim_staff_id text,
  parim_person_id text,
  first_name text,
  last_name text,
  second_phone text,
  staff_type text default 'security' check (staff_type in ('security', 'warehouse', 'event', 'admin', 'contractor', 'other')),
  nationality text,
  country_of_birth text,
  gender text,
  date_of_birth date,
  access_to_car boolean,
  driver_licence boolean,
  import_source text,
  import_batch_id uuid,
  notes text,
  constraint staff_employee_code_org_unique unique (organization_id, employee_code)
);

create trigger staff_set_updated_at
before update on public.staff
for each row execute function public.set_updated_at();

create table public.staff_ids (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  id_number text not null,
  issue_date date not null,
  expiry_date date not null,
  site_name text,
  role_title text not null,
  sia_number text,
  qr_token text not null unique,
  watermark_text text,
  is_current boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active',
  constraint staff_ids_id_number_org_unique unique (organization_id, id_number)
);

create trigger staff_ids_set_updated_at
before update on public.staff_ids
for each row execute function public.set_updated_at();

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  guard_id uuid not null references public.staff(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  device_name text,
  device_identifier text,
  app_version text,
  last_login_at timestamptz,
  is_trusted boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  guard_id uuid references public.staff(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  event_type text not null check (event_type in ('screenshot_attempt', 'screen_recording_detected', 'new_device_login', 'multiple_failed_logins', 'rooted_or_jailbroken_warning')),
  event_payload jsonb default '{}'::jsonb,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.staff_employment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  employment_type text,
  contract_number text,
  contract_start date,
  contract_end date,
  pay_schedule text,
  payroll_reference text,
  tax_code text,
  ni_number text,
  personal_pay_rate numeric,
  contracted_hours numeric,
  holiday_entitlement text,
  is_current boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_employment_set_updated_at
before update on public.staff_employment
for each row execute function public.set_updated_at();

create table public.staff_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  street_address text,
  house_no text,
  apartment_no text,
  city text,
  county text,
  post_code text,
  country text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_addresses_set_updated_at
before update on public.staff_addresses
for each row execute function public.set_updated_at();

create table public.staff_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  name text not null,
  relationship text,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_emergency_contacts_set_updated_at
before update on public.staff_emergency_contacts
for each row execute function public.set_updated_at();

create table public.staff_bank_details (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  account_holder_name text,
  bank_account_number text,
  sort_code text,
  reference_number text,
  bank_name text,
  country text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_bank_details_set_updated_at
before update on public.staff_bank_details
for each row execute function public.set_updated_at();

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  department text,
  sector text,
  requires_sia boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint positions_name_org_unique unique (organization_id, name)
);

create table public.staff_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  start_date date,
  end_date date,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text,
  name text not null,
  client_name text,
  address text,
  city text,
  region text,
  sector text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sites_code_org_unique unique (organization_id, code)
);

create trigger sites_set_updated_at
before update on public.sites
for each row execute function public.set_updated_at();

create table public.staff_site_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  assignment_type text,
  is_primary boolean not null default false,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'inactive', 'blocked', 'ended')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_site_assignments_set_updated_at
before update on public.staff_site_assignments
for each row execute function public.set_updated_at();

create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  has_expiry boolean not null default false,
  is_mandatory boolean not null default false,
  staff_type_scope text,
  created_at timestamptz not null default now(),
  constraint document_types_code_org_unique unique (organization_id, code)
);

create table public.staff_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  document_type_id uuid references public.document_types(id) on delete set null,
  document_number text,
  issue_date date,
  expiry_date date,
  status text not null default 'pending' check (status in ('pending', 'valid', 'expired', 'rejected', 'missing')),
  verified boolean not null default false,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  file_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  custom_document_name text,
  custom_document_code text,
  has_expiry boolean default false,
  show_on_staff_panel boolean not null default false
);

create trigger staff_documents_set_updated_at
before update on public.staff_documents
for each row execute function public.set_updated_at();

create table public.staff_training_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  training_name text not null,
  provider text,
  completed_date date,
  expiry_date date,
  certificate_url text,
  status text not null default 'valid' check (status in ('valid', 'expired', 'pending', 'revoked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_training_records_set_updated_at
before update on public.staff_training_records
for each row execute function public.set_updated_at();

create table public.id_verification_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  staff_id_record uuid references public.staff_ids(id) on delete set null,
  qr_token text,
  verified_at timestamptz not null default now(),
  result text not null check (result in ('valid', 'invalid', 'expired', 'revoked', 'not_found')),
  verified_by_profile_id uuid references public.profiles(id) on delete set null,
  ip_address text,
  user_agent text,
  notes text
);

create table public.staff_import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  source text not null,
  file_name text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  total_rows integer not null default 0,
  processed_rows integer not null default 0,
  failed_rows integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.staff_import_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.staff_import_batches(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null,
  processed boolean not null default false,
  processing_errors jsonb,
  matched_staff_id uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.screenshot_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  full_name text,
  email text,
  role text,
  page text not null,
  alert_type text not null,
  user_agent text,
  created_at timestamptz default now()
);

create table public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'manual',
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'trialing',
  plan text not null default 'free',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table public.billing_plans (
  key text primary key,
  name text not null,
  monthly_price numeric,
  user_limit integer,
  staff_limit integer,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.current_organization_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id
  from public.profiles
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1
$$;

create or replace function public.apply_staff_organization()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is null and new.profile_id is not null then
    select organization_id into new.organization_id
    from public.profiles
    where id = new.profile_id;
  end if;

  if new.organization_id is null then
    new.organization_id := public.current_organization_id();
  end if;

  return new;
end;
$$;

create trigger staff_apply_organization
before insert or update on public.staff
for each row execute function public.apply_staff_organization();

create or replace function public.apply_staff_child_organization()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is null and new.staff_id is not null then
    select organization_id into new.organization_id
    from public.staff
    where id = new.staff_id;
  end if;

  return new;
end;
$$;

create trigger staff_ids_apply_organization before insert or update on public.staff_ids for each row execute function public.apply_staff_child_organization();
create trigger devices_apply_organization before insert or update on public.devices for each row execute function public.apply_staff_child_organization();
create trigger staff_employment_apply_organization before insert or update on public.staff_employment for each row execute function public.apply_staff_child_organization();
create trigger staff_addresses_apply_organization before insert or update on public.staff_addresses for each row execute function public.apply_staff_child_organization();
create trigger staff_emergency_contacts_apply_organization before insert or update on public.staff_emergency_contacts for each row execute function public.apply_staff_child_organization();
create trigger staff_bank_details_apply_organization before insert or update on public.staff_bank_details for each row execute function public.apply_staff_child_organization();
create trigger staff_positions_apply_organization before insert or update on public.staff_positions for each row execute function public.apply_staff_child_organization();
create trigger staff_site_assignments_apply_organization before insert or update on public.staff_site_assignments for each row execute function public.apply_staff_child_organization();
create trigger staff_documents_apply_organization before insert or update on public.staff_documents for each row execute function public.apply_staff_child_organization();
create trigger staff_training_records_apply_organization before insert or update on public.staff_training_records for each row execute function public.apply_staff_child_organization();

create or replace function public.apply_actor_organization()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is null and new.actor_profile_id is not null then
    select organization_id into new.organization_id
    from public.profiles
    where id = new.actor_profile_id;
  end if;

  if new.organization_id is null then
    new.organization_id := public.current_organization_id();
  end if;

  return new;
end;
$$;

create trigger audit_logs_apply_organization before insert or update on public.audit_logs for each row execute function public.apply_actor_organization();

create index profiles_organization_id_idx on public.profiles(organization_id);
create index staff_organization_id_idx on public.staff(organization_id);
create index staff_ids_organization_id_idx on public.staff_ids(organization_id);
create index audit_logs_organization_id_idx on public.audit_logs(organization_id);
create index security_events_organization_id_idx on public.security_events(organization_id);
create index screenshot_alerts_organization_id_idx on public.screenshot_alerts(organization_id);
create index staff_documents_organization_id_idx on public.staff_documents(organization_id);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.staff enable row level security;
alter table public.staff_ids enable row level security;
alter table public.devices enable row level security;
alter table public.security_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.staff_employment enable row level security;
alter table public.staff_addresses enable row level security;
alter table public.staff_emergency_contacts enable row level security;
alter table public.staff_bank_details enable row level security;
alter table public.positions enable row level security;
alter table public.staff_positions enable row level security;
alter table public.sites enable row level security;
alter table public.staff_site_assignments enable row level security;
alter table public.document_types enable row level security;
alter table public.staff_documents enable row level security;
alter table public.staff_training_records enable row level security;
alter table public.id_verification_logs enable row level security;
alter table public.staff_import_batches enable row level security;
alter table public.staff_import_rows enable row level security;
alter table public.screenshot_alerts enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.billing_plans enable row level security;

create policy "tenant members can read their organization"
on public.organizations for select
to authenticated
using (id = public.current_organization_id());

create policy "tenant members can read profiles"
on public.profiles for select
to authenticated
using (organization_id = public.current_organization_id() or auth_user_id = auth.uid());

create policy "tenant members can update their own profile"
on public.profiles for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create policy "tenant members can read staff"
on public.staff for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "tenant members can read staff ids"
on public.staff_ids for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "tenant members can read tenant events"
on public.security_events for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "tenant members can read audit logs"
on public.audit_logs for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "tenant members can read documents"
on public.staff_documents for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "tenant members can read document types"
on public.document_types for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "tenant members can read screenshot alerts"
on public.screenshot_alerts for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "tenant members can create screenshot alerts"
on public.screenshot_alerts for insert
to authenticated
with check (organization_id = public.current_organization_id());

create policy "public can verify id tokens"
on public.staff_ids for select
to anon, authenticated
using (true);

create policy "public can read staff for id verification"
on public.staff for select
to anon, authenticated
using (true);

insert into public.document_types (organization_id, code, name, has_expiry, is_mandatory, staff_type_scope)
values
  (null, 'sia', 'SIA Licence', true, true, 'security'),
  (null, 'right_to_work', 'Right to Work', true, true, null),
  (null, 'passport', 'Passport', true, false, null)
on conflict do nothing;

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
