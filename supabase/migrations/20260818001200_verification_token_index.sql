-- Migration 012: make public ID verification lookups deterministic and fast.
create unique index if not exists staff_ids_qr_token_unique_idx
  on public.staff_ids (qr_token)
  where qr_token is not null;
