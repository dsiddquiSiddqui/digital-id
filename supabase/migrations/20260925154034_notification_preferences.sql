alter table public.organizations
  add column if not exists notification_preferences jsonb not null default '{
    "document_expiry": true,
    "document_renewals": true,
    "security_alerts": true,
    "billing_updates": true,
    "workspace_activity": true
  }'::jsonb;
