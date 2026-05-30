-- 0025_fix_manage_metadata_check.sql
-- Fix: current_user_has_manage_metadata helper must also check
-- role_permission_grants for system-level grants (owner/admin),
-- since existing company roles created before migration 0023
-- may not have manage_metadata in company_role_permissions.

create or replace function app.current_user_has_manage_metadata()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app.company_role_assignments cra
    join app.company_roles cr on cra.role_id = cr.id and cr.is_active = true
    where cra.user_id = auth.uid() and cra.is_active = true
      and (
        exists (
          select 1
          from app.company_role_permissions crp
          where crp.role_id = cr.id
            and crp.permission_key = 'manage_metadata'
            and crp.is_granted = true
        )
        or exists (
          select 1
          from app.role_permission_grants rpg
          where rpg.role::text = cr.role_key
            and rpg.permission_key = 'manage_metadata'
            and rpg.is_granted = true
        )
      )
  );
$$;
