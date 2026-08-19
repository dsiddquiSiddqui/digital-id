-- Close legacy Data API exposure. These operational tables are accessed only
-- through server-side clients using the service role.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_tasks',
    'app_test_runs',
    'export_templates',
    'id_card_exports',
    'monitoring_checks',
    'production_provider_configs',
    'qa_review_items',
    'report_schedules',
    'scheduled_job_runs',
    'scheduled_jobs',
    'support_tickets',
    'system_health_events'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all privileges on table public.%I from anon', table_name);
      execute format('revoke all privileges on table public.%I from authenticated', table_name);
    end if;
  end loop;
end
$$;

-- Verification is performed by the server-only service client. The previous
-- `using (true)` policies exposed every staff and ID row to anonymous callers
-- and overrode tenant isolation for authenticated callers.
drop policy if exists "public can verify id tokens" on public.staff_ids;
drop policy if exists "public can read staff for id verification" on public.staff;

revoke all privileges on table public.staff from anon;
revoke all privileges on table public.staff_ids from anon;

-- Keep only the operation required by the tenant-scoped SELECT policies.
revoke insert, update, delete, truncate, references, trigger
  on table public.staff, public.staff_ids
  from authenticated;
grant select on table public.staff, public.staff_ids to authenticated;
