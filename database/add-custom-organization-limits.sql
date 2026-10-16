-- Optional per-organization capacity overrides. A null value inherits the
-- selected billing plan's limit; a positive integer replaces it.

alter table public.organizations
  add column if not exists custom_user_limit integer,
  add column if not exists custom_staff_limit integer;

alter table public.organizations
  drop constraint if exists organizations_custom_user_limit_positive,
  add constraint organizations_custom_user_limit_positive
    check (custom_user_limit is null or custom_user_limit > 0),
  drop constraint if exists organizations_custom_staff_limit_positive,
  add constraint organizations_custom_staff_limit_positive
    check (custom_staff_limit is null or custom_staff_limit > 0);
