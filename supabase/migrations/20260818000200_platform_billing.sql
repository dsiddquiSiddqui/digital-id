-- Migration 002. Run this on an existing SaaS database to add package metadata and make
-- new organizations default to the free package.

alter table public.organizations
alter column plan set default 'free';

alter table public.organization_subscriptions
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
