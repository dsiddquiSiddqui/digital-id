-- Platform-owner operations: customer lifecycle, ownership, churn, tasks,
-- approvals, and plan history. These tables are service-role only.

alter table public.organizations
  add column if not exists owner_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists customer_success_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists lifecycle_stage text not null default 'active'
    check (lifecycle_stage in ('lead', 'trial', 'active', 'at_risk', 'cancellation_scheduled', 'cancelled', 'archived')),
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists cancellation_scheduled_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists billing_contact_email text,
  add column if not exists technical_contact_email text,
  add column if not exists data_protection_contact_email text,
  add column if not exists customer_lifetime_value numeric not null default 0,
  add column if not exists last_customer_contact_at timestamptz,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists churn_risk_reason text;

alter table public.organization_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz;

create table if not exists public.organization_owner_transfers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  previous_owner_profile_id uuid references public.profiles(id) on delete set null, new_owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  transferred_by_profile_id uuid references public.profiles(id) on delete set null, reason text not null, created_at timestamptz not null default now()
);

create table if not exists public.platform_support_tasks (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null, description text, status text not null default 'open' check (status in ('open', 'in_progress', 'blocked', 'completed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to_profile_id uuid references public.profiles(id) on delete set null, created_by_profile_id uuid references public.profiles(id) on delete set null,
  due_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.platform_approval_requests (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete cascade,
  action_type text not null, entity_type text not null, entity_id uuid, request_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  requested_by_profile_id uuid references public.profiles(id) on delete set null, reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  review_note text, reviewed_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.organization_plan_history (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  previous_plan text, new_plan text not null, change_type text not null check (change_type in ('signup', 'upgrade', 'downgrade', 'renewal', 'cancellation', 'reactivation', 'manual')),
  effective_at timestamptz not null default now(), changed_by_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists organizations_lifecycle_stage_idx on public.organizations(lifecycle_stage);
create index if not exists organizations_next_follow_up_idx on public.organizations(next_follow_up_at) where next_follow_up_at is not null;
create index if not exists owner_transfers_organization_idx on public.organization_owner_transfers(organization_id, created_at desc);
create index if not exists support_tasks_organization_status_idx on public.platform_support_tasks(organization_id, status, due_at);
create index if not exists approval_requests_status_idx on public.platform_approval_requests(status, created_at desc);
create index if not exists plan_history_organization_idx on public.organization_plan_history(organization_id, effective_at desc);

drop trigger if exists platform_support_tasks_set_updated_at on public.platform_support_tasks;
create trigger platform_support_tasks_set_updated_at before update on public.platform_support_tasks for each row execute function public.set_updated_at();
drop trigger if exists platform_approval_requests_set_updated_at on public.platform_approval_requests;
create trigger platform_approval_requests_set_updated_at before update on public.platform_approval_requests for each row execute function public.set_updated_at();

alter table public.organization_owner_transfers enable row level security;
alter table public.platform_support_tasks enable row level security;
alter table public.platform_approval_requests enable row level security;
alter table public.organization_plan_history enable row level security;
revoke all on public.organization_owner_transfers from anon, authenticated;
revoke all on public.platform_support_tasks from anon, authenticated;
revoke all on public.platform_approval_requests from anon, authenticated;
revoke all on public.organization_plan_history from anon, authenticated;

update public.organizations organization
set owner_profile_id = (
  select profile.id from public.profiles profile
  where profile.organization_id = organization.id and profile.role = 'admin'
  order by profile.is_active desc, profile.created_at asc limit 1
)
where organization.owner_profile_id is null;
