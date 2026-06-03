-- Phase 6.2: Export/Import Permission Keys
--
-- Purpose:
-- - seed export/import permission keys for CRM Lead and Opportunity
-- - grant to owner/admin system roles and tenant-level company roles
-- - these are used by the frontend export/import UI

-- ── 1. Permission Catalog ──────────────────────────────────────────────────────

insert into app.permissions (
  permission_key,
  module_key,
  module_label,
  permission_label,
  description,
  sort_order
) values
  ('export_crm_lead', 'crm', 'CRM', 'Export Lead', 'Export CRM leads to CSV.', 514),
  ('import_crm_lead', 'crm', 'CRM', 'Import Lead', 'Import CRM leads from CSV.', 515),
  ('export_crm_opportunity', 'crm', 'CRM', 'Export Opportunity', 'Export CRM opportunities to CSV.', 544),
  ('import_crm_opportunity', 'crm', 'CRM', 'Import Opportunity', 'Import CRM opportunities from CSV.', 545)
on conflict (permission_key) do update
set
  module_key = excluded.module_key,
  module_label = excluded.module_label,
  permission_label = excluded.permission_label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- ── 2. System Role Grants (owner + admin) ───────────────────────────────────────

insert into app.role_permission_grants (
  role,
  permission_key,
  is_granted
)
select role_name.role, perm.permission_key, true
from (values ('owner'::app.role_type), ('admin'::app.role_type)) as role_name(role)
cross join (
  values
    ('export_crm_lead'),
    ('import_crm_lead'),
    ('export_crm_opportunity'),
    ('import_crm_opportunity')
) as perm(permission_key)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

-- ── 3. Tenant-level Company Role Grants (owner + admin) ────────────────────────

do $$
declare
  v_perm_keys text[] := array[
    'export_crm_lead','import_crm_lead',
    'export_crm_opportunity','import_crm_opportunity'
  ];
begin
  insert into app.company_role_permissions (role_id, permission_key, is_granted)
  select cr.id, perm.permission_key, true
  from app.company_roles cr
  cross join unnest(v_perm_keys) as perm(permission_key)
  where cr.is_active = true
    and cr.role_key in ('owner', 'admin')
  on conflict (role_id, permission_key) do update
  set is_granted = excluded.is_granted;
end;
$$;
