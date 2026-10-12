create or replace function public.revoke_auth_sessions(target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = auth, public, pg_temp
as $$
declare
  removed integer;
begin
  delete from auth.sessions where user_id = target_user_id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.revoke_auth_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_auth_sessions(uuid) to service_role;

comment on function public.revoke_auth_sessions(uuid) is
  'Service-role-only portal operation that revokes all refresh sessions for one auth user.';
