create or replace function private.request_actor(p_actor_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  authenticated_actor uuid;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') = 'service_role' then
    if p_actor_id is null then
      raise exception 'Actor is required';
    end if;
    return p_actor_id;
  end if;

  authenticated_actor := (select auth.uid());
  if authenticated_actor is not null then
    if authenticated_actor <> p_actor_id then
      raise exception 'Actor does not match authenticated user';
    end if;
    return authenticated_actor;
  end if;

  raise exception 'Authentication required';
end;
$function$;

revoke all on function private.request_actor(uuid)
from public, anon, authenticated;
grant execute on function private.request_actor(uuid)
to authenticated, service_role;
