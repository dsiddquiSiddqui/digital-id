-- Operational tables are accessed only by authenticated server-side routes.
do $$
declare
  operational_table text;
begin
  foreach operational_table in array array[
    'admin_tasks', 'app_test_runs', 'export_templates', 'id_card_exports',
    'monitoring_checks', 'production_provider_configs', 'qa_review_items',
    'report_schedules', 'scheduled_job_runs', 'scheduled_jobs',
    'support_tickets', 'system_health_events'
  ]
  loop
    if to_regclass(format('public.%I', operational_table)) is not null then
      execute format('alter table public.%I enable row level security', operational_table);
      execute format('revoke all privileges on table public.%I from anon', operational_table);
      execute format('revoke all privileges on table public.%I from authenticated', operational_table);
    end if;
  end loop;
end
$$;

alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.apply_staff_organization() set search_path = public, pg_temp;
alter function public.apply_staff_child_organization() set search_path = public, pg_temp;
alter function public.apply_actor_organization() set search_path = public, pg_temp;

revoke execute on function public.current_organization_id() from public, anon;
grant execute on function public.current_organization_id() to authenticated, service_role;

drop policy if exists "public can verify id tokens" on public.staff_ids;
drop policy if exists "public can read staff for id verification" on public.staff;
revoke all privileges on table public.staff from anon;
revoke all privileges on table public.staff_ids from anon;

-- Evaluate auth.uid() once per statement rather than once per row.
drop policy if exists "tenant members can read profiles" on public.profiles;
create policy "tenant members can read profiles"
on public.profiles for select
to authenticated
using (
  organization_id = public.current_organization_id()
  or auth_user_id = (select auth.uid())
);

drop policy if exists "tenant members can update their own profile" on public.profiles;
create policy "tenant members can update their own profile"
on public.profiles for update
to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));
