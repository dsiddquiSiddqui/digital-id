-- Migration 003. Run this on an existing SaaS database to store tenant favicon and
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
