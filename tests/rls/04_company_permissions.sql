-- 04_company_permissions.sql
-- Verification notes for the company permission catalog and role matrix.

-- Expected: 35+ permission catalog rows grouped by module.
select module_key, module_label, count(*) as permission_count
from app.permissions
group by module_key, module_label
order by module_key;

-- Expected: owner/admin should receive the full matrix.
select role, count(*) as granted_permissions
from app.role_permission_grants
where is_granted = true
group by role
order by role;

-- Expected: view_company and view_dashboard exist.
select permission_key, module_key, module_label
from app.permissions
where permission_key in ('view_company', 'view_dashboard');

-- Expected: role grants are safe to re-run via migration upsert.
select role, permission_key, is_granted
from app.role_permission_grants
where role in ('owner', 'admin', 'viewer', 'auditor')
order by role, permission_key;
