-- Phase 6.1: Company branding and safe Theme Studio foundation.
-- Stores only approved branding fields and a strict custom CSS variable allowlist.
-- No arbitrary JavaScript or unrestricted CSS is accepted by these RPCs.

alter table app.tenants
  add column if not exists favicon_url text,
  add column if not exists theme_primary_color text not null default '#0f5f63',
  add column if not exists theme_accent_color text not null default '#f5b84b',
  add column if not exists theme_sidebar_color text not null default '#10243a',
  add column if not exists theme_topbar_color text not null default '#ffffff',
  add column if not exists theme_density_mode text not null default 'compact',
  add column if not exists theme_custom_variables jsonb not null default '{}'::jsonb;

alter table app.tenants
  drop constraint if exists tenants_theme_primary_color_check,
  add constraint tenants_theme_primary_color_check check (theme_primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists tenants_theme_accent_color_check,
  add constraint tenants_theme_accent_color_check check (theme_accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists tenants_theme_sidebar_color_check,
  add constraint tenants_theme_sidebar_color_check check (theme_sidebar_color ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists tenants_theme_topbar_color_check,
  add constraint tenants_theme_topbar_color_check check (theme_topbar_color ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists tenants_theme_density_mode_check,
  add constraint tenants_theme_density_mode_check check (theme_density_mode in ('compact', 'comfortable'));

comment on column app.tenants.favicon_url is 'Company favicon URL for safe branding.';
comment on column app.tenants.theme_primary_color is 'Safe company theme primary color as #RRGGBB.';
comment on column app.tenants.theme_accent_color is 'Safe company theme accent color as #RRGGBB.';
comment on column app.tenants.theme_sidebar_color is 'Safe company theme sidebar color as #RRGGBB.';
comment on column app.tenants.theme_topbar_color is 'Safe company theme topbar color as #RRGGBB.';
comment on column app.tenants.theme_density_mode is 'Company UI density: compact or comfortable.';
comment on column app.tenants.theme_custom_variables is 'Strict allowlist of safe CSS variables only; no arbitrary CSS or JavaScript.';

create or replace function public.safe_company_theme_variables(p_variables jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from jsonb_each_text(coalesce(p_variables, '{}'::jsonb)) item(key, value)
  where key in (
    '--hippo-focus-ring',
    '--hippo-success-color',
    '--hippo-warning-color',
    '--hippo-danger-color',
    '--hippo-info-color'
  )
  and value ~ '^#[0-9A-Fa-f]{6}$';
$$;

create or replace function public.get_company_theme(p_company_id uuid)
returns table (
  company_id uuid,
  company_name text,
  logo_url text,
  favicon_url text,
  primary_color text,
  accent_color text,
  sidebar_color text,
  topbar_color text,
  density_mode text,
  custom_variables jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select
    t.id as company_id,
    t.name as company_name,
    t.logo_url,
    t.favicon_url,
    coalesce(t.theme_primary_color, '#0f5f63') as primary_color,
    coalesce(t.theme_accent_color, '#f5b84b') as accent_color,
    coalesce(t.theme_sidebar_color, '#10243a') as sidebar_color,
    coalesce(t.theme_topbar_color, '#ffffff') as topbar_color,
    case when t.theme_density_mode = 'comfortable' then 'comfortable' else 'compact' end as density_mode,
    public.safe_company_theme_variables(t.theme_custom_variables) as custom_variables,
    t.updated_at
  from app.tenants t
  where t.id = p_company_id
    and app.current_user_is_tenant_member(t.id);
$$;

create or replace function public.save_company_theme(p_payload jsonb)
returns table (
  company_id uuid,
  company_name text,
  logo_url text,
  favicon_url text,
  primary_color text,
  accent_color text,
  sidebar_color text,
  topbar_color text,
  density_mode text,
  custom_variables jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_company_id uuid := (p_payload->>'company_id')::uuid;
  v_logo_url text := nullif(trim(coalesce(p_payload->>'logo_url', '')), '');
  v_favicon_url text := nullif(trim(coalesce(p_payload->>'favicon_url', '')), '');
  v_primary text := coalesce(nullif(trim(p_payload->>'primary_color'), ''), '#0f5f63');
  v_accent text := coalesce(nullif(trim(p_payload->>'accent_color'), ''), '#f5b84b');
  v_sidebar text := coalesce(nullif(trim(p_payload->>'sidebar_color'), ''), '#10243a');
  v_topbar text := coalesce(nullif(trim(p_payload->>'topbar_color'), ''), '#ffffff');
  v_density text := lower(coalesce(nullif(trim(p_payload->>'density_mode'), ''), 'compact'));
begin
  if not app.current_user_has_tenant_role(v_company_id, array['owner','admin']) then
    raise exception 'Only company owner/admin can update company branding.';
  end if;

  if v_primary !~ '^#[0-9A-Fa-f]{6}$' or v_accent !~ '^#[0-9A-Fa-f]{6}$' or v_sidebar !~ '^#[0-9A-Fa-f]{6}$' or v_topbar !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Theme colors must be #RRGGBB values.';
  end if;

  if v_density not in ('compact', 'comfortable') then
    raise exception 'Density mode must be compact or comfortable.';
  end if;

  if v_logo_url is not null and v_logo_url !~* '^https?://' then
    raise exception 'Logo URL must be http(s).';
  end if;

  if v_favicon_url is not null and v_favicon_url !~* '^https?://' then
    raise exception 'Favicon URL must be http(s).';
  end if;

  update app.tenants t
  set
    logo_url = v_logo_url,
    favicon_url = v_favicon_url,
    theme_primary_color = lower(v_primary),
    theme_accent_color = lower(v_accent),
    theme_sidebar_color = lower(v_sidebar),
    theme_topbar_color = lower(v_topbar),
    theme_density_mode = v_density,
    theme_custom_variables = public.safe_company_theme_variables(p_payload->'custom_variables'),
    updated_at = now()
  where t.id = v_company_id;

  return query select * from public.get_company_theme(v_company_id);
end;
$$;

create or replace function public.reset_company_theme(p_company_id uuid)
returns table (
  company_id uuid,
  company_name text,
  logo_url text,
  favicon_url text,
  primary_color text,
  accent_color text,
  sidebar_color text,
  topbar_color text,
  density_mode text,
  custom_variables jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, app, auth
as $$
begin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    raise exception 'Only company owner/admin can reset company branding.';
  end if;

  update app.tenants t
  set
    logo_url = null,
    favicon_url = null,
    theme_primary_color = '#0f5f63',
    theme_accent_color = '#f5b84b',
    theme_sidebar_color = '#10243a',
    theme_topbar_color = '#ffffff',
    theme_density_mode = 'compact',
    theme_custom_variables = '{}'::jsonb,
    updated_at = now()
  where t.id = p_company_id;

  return query select * from public.get_company_theme(p_company_id);
end;
$$;

grant execute on function public.safe_company_theme_variables(jsonb) to authenticated;
grant execute on function public.get_company_theme(uuid) to authenticated;
grant execute on function public.save_company_theme(jsonb) to authenticated;
grant execute on function public.reset_company_theme(uuid) to authenticated;

-- Make Theme Studio reachable for company owners/admins through the existing workspace system.
insert into app.erp_workspace_items (workspace_key, item_key, label, item_type, target, icon, sort_order, is_active, required_permission_key)
values ('company_admin', 'theme_studio', 'Theme Studio', 'page', 'theme_studio', 'Palette', 45, true, 'update_company')
on conflict (workspace_key, item_key) do update set
  workspace_key = excluded.workspace_key,
  label = excluded.label,
  item_type = excluded.item_type,
  target = excluded.target,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true,
  required_permission_key = excluded.required_permission_key;
