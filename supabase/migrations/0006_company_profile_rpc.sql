create or replace function public.get_company_profile(p_company_id uuid)
returns table (
  id uuid,
  name text,
  slug text,
  gst_number text,
  email text,
  phone text,
  address text,
  logo_url text,
  industry_type text,
  currency_code text,
  financial_year_start date
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select
    t.id,
    t.name,
    t.slug,
    t.gst_number,
    t.email,
    t.phone,
    t.address,
    t.logo_url,
    t.industry_type,
    t.currency_code,
    t.financial_year_start
  from app.tenants t
  where t.id = p_company_id
    and app.current_user_is_tenant_member(t.id);
$$;

create or replace function public.update_company_profile(
  p_payload jsonb
)
returns table (
  id uuid,
  name text,
  slug text,
  gst_number text,
  email text,
  phone text,
  address text,
  logo_url text,
  industry_type text,
  currency_code text,
  financial_year_start date
)
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_company_id uuid := (p_payload->>'id')::uuid;
  v_name text := nullif(trim(p_payload->>'name'), '');
  v_slug text := nullif(trim(p_payload->>'slug'), '');
  v_gst_number text := nullif(trim(p_payload->>'gst_number'), '');
  v_email text := nullif(trim(p_payload->>'email'), '');
  v_phone text := nullif(trim(p_payload->>'phone'), '');
  v_address text := nullif(trim(p_payload->>'address'), '');
  v_logo_url text := nullif(trim(p_payload->>'logo_url'), '');
  v_industry_type text := nullif(trim(p_payload->>'industry_type'), '');
  v_currency_code text := upper(nullif(trim(p_payload->>'currency_code'), ''));
  v_financial_year_start date := nullif(trim(p_payload->>'financial_year_start'), '')::date;
begin
  if not app.current_user_has_tenant_role(v_company_id, array['owner','admin']) then
    raise exception 'Not authorized to update company profile';
  end if;

  if v_name is null or v_slug is null or v_email is null or v_phone is null or v_address is null or v_industry_type is null or v_currency_code is null or v_financial_year_start is null then
    raise exception 'Missing required company profile fields';
  end if;

  update app.tenants t
  set
    name = v_name,
    slug = v_slug,
    gst_number = v_gst_number,
    email = v_email,
    phone = v_phone,
    address = v_address,
    logo_url = v_logo_url,
    industry_type = v_industry_type,
    currency_code = v_currency_code,
    financial_year_start = v_financial_year_start,
    updated_at = now()
  where t.id = v_company_id;

  return query
  select
    t.id,
    t.name,
    t.slug,
    t.gst_number,
    t.email,
    t.phone,
    t.address,
    t.logo_url,
    t.industry_type,
    t.currency_code,
    t.financial_year_start
  from app.tenants t
  where t.id = v_company_id;
end;
$$;

grant execute on function public.get_company_profile(uuid) to authenticated;
grant execute on function public.update_company_profile(jsonb) to authenticated;
