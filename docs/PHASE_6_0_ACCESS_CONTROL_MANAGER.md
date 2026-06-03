# Phase 6.0: Access Control Manager Foundation

## Goal

Build the Access Control Manager foundation on top of the existing company-role and metadata permission system without duplicating role tables or breaking current permission checks.

This phase intentionally does **not** start:

- Purchase Orders
- Theme Studio
- Print Format Builder
- Client Scripts

## Existing schema inspection

Phase 6.0 reuses the current access-control foundation already present in Supabase:

- `app.permissions` stores the permission catalog.
- `app.role_permission_grants` stores global/default grants.
- `app.company_roles` stores company-scoped roles.
- `app.company_role_permissions` stores company-role permission grants.
- `app.company_role_assignments` stores user-to-role assignments per company.
- `app.tenant_members` stores company membership.
- `app.profiles` stores user profile identity data.
- `app.erp_doctypes`, `app.erp_doctype_actions`, and `app.erp_workspace_items` already model DocTypes, action-to-permission mapping, and menu/page/report access metadata.

Important compatibility observations:

- User-facing language is already moving toward **Company**, but internal schema still uses `tenant_id` for company context.
- `public.current_user_has_doctype_permission()` already checks DocType permissions through `app.erp_doctype_actions` plus company-role assignments.
- `app.company_role_assignments` can hold multiple active assignments, but the previous `get_company_users()` behavior effectively surfaced only one role’s effective permissions to the UI.

## Design decisions

- Do not create duplicate role or role-assignment tables.
- Extend the existing company-role model with matrix-oriented RPCs instead of introducing a parallel permission engine.
- Keep DocType rights compatible with the current dynamic metadata checks.
- Support page/menu/report rights by deriving rights from existing permission keys and workspace metadata.
- Preserve owner/admin defaults through the existing default-role bootstrapping path.

## Migration

Created:

- `supabase/migrations/0042_access_control_manager.sql`

This migration adds the Access Control Manager foundation by extending the current schema with helper functions and compatibility fixes:

- `public.normalize_access_action_key`
- `public.default_access_permission_key`
- `public.get_access_control_targets`
- `public.get_access_control_matrix`
- `public.get_company_user_role_assignments`
- `public.set_company_user_roles`
- `public.save_access_control_matrix`

It also updates compatibility behavior:

- `public.get_company_users` now unions effective permissions across all active company-role assignments.
- `public.set_company_user_role` delegates to the multi-role assignment function.
- `public.current_user_has_doctype_permission` now normalizes action names such as `delete`, `deactivate`, and `remove`.

Supported rights in this phase:

- `read`
- `create`
- `update`
- `delete`
- `submit`
- `cancel`
- `print`
- `export`
- `import`
- `report`

## UI delivered

Created:

- `src/components/permissions/AccessControlManagerPage.tsx`
- `src/components/permissions/UserRoleAssignmentPage.tsx`
- `src/components/permissions/PermissionMatrix.tsx`
- `src/lib/access-control.ts`
- `src/lib/access-control-api.ts`

Integrated:

- Access Builder now links to Access Control Manager.
- Metadata Studio home now exposes access management clearly.
- Check / Repair now explains that missing grants are fixed in Access Control Manager after metadata repair.
- Permission-denied messaging now points users to Access Control Manager with the required permission key.

## UX delivered

The foundation now supports:

- selecting company
- selecting or creating role
- selecting module and DocType/target
- editing a rights matrix
- saving role changes
- previewing effective rights for a selected user
- showing missing-access diagnostics for the selected target

The dedicated multi-role user assignment page was also added for follow-up integration, while the legacy Users/Roles screen remains in place for compatibility with the current app flow and test suite.

## Verification

Command results during implementation:

- `npm run typecheck` — pass
- `npm run lint` — pass with warnings only
- `npm run build` — pass
- `npm run test:simulation` — pass
- `npm run test -- tests/frontend/users-roles.spec.tsx` — pass after compatibility fixes
- `npm run test` — still has unrelated/pre-existing failures in auth/dashboard/permission-gate flows

Browser verification status:

- Added `scripts/verify_phase6_access_control.mjs` for a real local Playwright walkthrough.
- The local Vite app and verification script both run, but the currently stored local login no longer leaves `/login`, so the live authenticated browser flow could not be completed in this environment.

## Remaining gaps

- `UserRoleAssignmentPage.tsx` exists but is not yet the default route for the current Users/Roles screen.
- Live browser verification is blocked by the current local auth/login state.
- `npm run test` still has unrelated failures outside the Access Control Manager foundation:
  - `tests/frontend/dashboard-kpi.spec.tsx`
  - `tests/frontend/auth-routes.spec.tsx`
  - `tests/frontend/auth-state.spec.tsx`
  - `tests/frontend/permission-gates.spec.tsx`
  - `tests/frontend/app.spec.tsx`
- Purchase Orders, Theme Studio, Print Format Builder, and Client Scripts remain intentionally untouched.
