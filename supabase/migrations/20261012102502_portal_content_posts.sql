create table if not exists public.platform_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text,
  content text not null default '',
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  visibility text not null default 'public' check (visibility in ('public', 'portal')),
  tags text[] not null default '{}',
  seo_title text,
  seo_description text,
  author_profile_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_posts_status_published_idx
  on public.platform_posts (status, published_at desc);
create index if not exists platform_posts_author_idx
  on public.platform_posts (author_profile_id);

alter table public.platform_posts enable row level security;
revoke all on table public.platform_posts from anon, authenticated;

comment on table public.platform_posts is
  'Platform-owned editorial content managed from the private portal.';
