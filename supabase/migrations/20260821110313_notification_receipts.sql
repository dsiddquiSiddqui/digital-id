-- Store read state per recipient. Organization-wide notifications have a null
-- profile_id, so notifications.read_at cannot represent who has read them.
create table if not exists public.notification_receipts (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (notification_id, profile_id)
);

create index if not exists notification_receipts_profile_id_idx
on public.notification_receipts(profile_id);

-- Notification state is only accessed through tenant-scoped server routes.
alter table public.notifications enable row level security;
revoke all privileges on table public.notifications from anon;
revoke all privileges on table public.notifications from authenticated;

alter table public.notification_receipts enable row level security;
revoke all privileges on table public.notification_receipts from anon;
revoke all privileges on table public.notification_receipts from authenticated;
