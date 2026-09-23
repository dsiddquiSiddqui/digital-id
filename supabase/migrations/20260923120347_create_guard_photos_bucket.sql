-- Staff photos and organization branding are served by public URL after a
-- server-authorized upload. Restrict files at the bucket boundary as well.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guard-photos',
  'guard-photos',
  true,
  8388608,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
