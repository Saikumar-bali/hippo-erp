create or replace function public.get_my_companies()
returns table (
  id uuid,
  name text,
  slug text,
  role text
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select t.id, t.name, t.slug, tm.role::text as role
  from app.tenant_members tm
  join app.tenants t on t.id = tm.tenant_id
  where tm.user_id = auth.uid()
    and tm.is_active = true
  order by t.name;
$$;

grant execute on function public.get_my_companies() to authenticated;
