-- Migration 004: support tickets for in-app documentation and issue tracking.
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
