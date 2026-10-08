-- Platform access roles and a full support case conversation model.

alter table public.profiles
  add column if not exists platform_role text
    check (platform_role in ('owner', 'administrator', 'support_agent', 'billing_agent', 'auditor')),
  add column if not exists platform_access_scope text not null default 'all_organizations'
    check (platform_access_scope in ('all_organizations', 'assigned_organizations', 'read_only')),
  add column if not exists platform_permissions jsonb not null default '[]'::jsonb,
  add column if not exists portal_last_active_at timestamptz;

with ranked_portal_users as (
  select id, row_number() over (order by created_at asc, id asc) as position
  from public.profiles
  where organization_id is null and role = 'super_admin'
)
update public.profiles as profile
set platform_role = case when ranked.position = 1 then 'owner' else 'administrator' end,
    platform_permissions = case when ranked.position = 1
      then '["organizations.manage", "portal_users.manage", "support.manage", "billing.manage", "audit.read"]'::jsonb
      else '["organizations.manage", "portal_users.manage", "support.manage", "billing.read", "audit.read"]'::jsonb
    end
from ranked_portal_users as ranked
where profile.id = ranked.id and profile.platform_role is null;

alter table public.support_tickets
  add column if not exists first_response_due_at timestamptz,
  add column if not exists resolution_due_at timestamptz,
  add column if not exists first_response_at timestamptz,
  add column if not exists last_customer_response_at timestamptz,
  add column if not exists last_agent_response_at timestamptz,
  add column if not exists escalation_reason text;

alter table public.support_tickets drop constraint if exists support_tickets_status_check;
alter table public.support_tickets add constraint support_tickets_status_check
  check (status in ('open', 'triaged', 'in_progress', 'waiting_on_customer', 'escalated', 'resolved', 'closed'));

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  author_type text not null check (author_type in ('customer', 'portal_agent', 'system')),
  visibility text not null default 'customer' check (visibility in ('customer', 'internal')),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists profiles_platform_role_idx
  on public.profiles(platform_role) where organization_id is null;
create index if not exists support_tickets_queue_idx
  on public.support_tickets(status, priority, first_response_due_at, resolution_due_at);
create index if not exists support_ticket_messages_ticket_idx
  on public.support_ticket_messages(ticket_id, created_at);

alter table public.support_ticket_messages enable row level security;
revoke all on public.support_ticket_messages from anon, authenticated;
