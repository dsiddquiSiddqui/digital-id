-- Preserve Stripe's cancellation-at-period-end state so billing can show whether
-- a subscription will renew automatically or end on its next renewal date.
alter table public.organization_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;
