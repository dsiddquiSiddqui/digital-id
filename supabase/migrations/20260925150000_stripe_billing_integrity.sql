-- Stripe event delivery is at-least-once. Keep event processing and subscription
-- records idempotent even when Stripe retries or delivers events concurrently.
create unique index if not exists billing_events_provider_event_unique
on public.billing_events(provider, provider_event_id)
where provider_event_id is not null;

create unique index if not exists organization_subscriptions_provider_subscription_unique
on public.organization_subscriptions(provider, provider_subscription_id)
where provider_subscription_id is not null;
