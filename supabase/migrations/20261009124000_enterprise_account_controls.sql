-- Enterprise identity lifecycle controls for portal-managed tenant accounts.
alter table public.profiles
  add column if not exists force_password_change boolean not null default false,
  add column if not exists access_version integer not null default 1,
  add column if not exists locked_at timestamptz,
  add column if not exists lock_reason text;

alter table public.user_invitations
  add column if not exists staff_id uuid references public.staff(id) on delete cascade;

create index if not exists user_invitations_staff_id_idx
  on public.user_invitations(staff_id)
  where staff_id is not null;

create index if not exists session_activity_profile_last_seen_idx
  on public.session_activity(profile_id, last_seen_at desc);
