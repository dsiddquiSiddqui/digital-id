alter table public.platform_posts drop constraint if exists platform_posts_status_check;
alter table public.platform_posts
  add column if not exists category text,
  add column if not exists author_name text,
  add column if not exists scheduled_for timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists og_image_url text,
  add column if not exists view_count bigint not null default 0,
  add constraint platform_posts_status_check check (status in ('draft', 'pending_review', 'scheduled', 'published', 'archived'));

create table if not exists public.platform_post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.platform_posts(id) on delete cascade,
  revision_number integer not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (post_id, revision_number)
);

create table if not exists public.platform_post_events (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.platform_posts(id) on delete cascade,
  event_type text not null default 'view' check (event_type in ('view', 'share')),
  referrer_host text,
  occurred_at timestamptz not null default now()
);

create index if not exists platform_posts_schedule_idx on public.platform_posts (scheduled_for) where status = 'scheduled';
create index if not exists platform_post_revisions_post_idx on public.platform_post_revisions (post_id, revision_number desc);
create index if not exists platform_post_events_post_idx on public.platform_post_events (post_id, occurred_at desc);

alter table public.platform_post_revisions enable row level security;
alter table public.platform_post_events enable row level security;
revoke all on table public.platform_post_revisions from anon, authenticated;
revoke all on table public.platform_post_events from anon, authenticated;
revoke all on sequence public.platform_post_events_id_seq from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
