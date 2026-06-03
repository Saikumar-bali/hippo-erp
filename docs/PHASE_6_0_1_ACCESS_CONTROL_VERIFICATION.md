# Phase 6.0.1 Access Control Verification

## Scope

Phase 6.0.1 verifies and stabilizes the existing Access Control Manager foundation from Phase 6.0 without starting any new platform feature.

Out of scope for this phase:

- Company Branding / Theme Studio
- Purchase Orders
- Print Format Builder
- Client Scripts
- Any additional platform feature beyond access-control verification and stabilization

## Branch Safety

- Local branch name during this phase: `main`
- Remote branch required by project tasking: `origin/phase-2.5-metadata-engine`
- Risk observed: local `main` had been fast-forwarded from the phase branch content
- Rule followed for this phase: all final pushes target `phase-2.5-metadata-engine`, not `main`

## What Was Verified

### 1. Supabase Cloud migration 0042 smoke test

Migration under test:

- `supabase/migrations/0042_access_control_manager.sql`

Supabase Cloud verification was run against the configured project behind `VITE_SUPABASE_URL` using the local PAT and Management API because the local Supabase CLI binary is unavailable on this Windows machine.

#### RPC smoke results

| RPC | Result | Notes |
| --- | --- | --- |
| `public.normalize_access_action_key` | PASS | `remove`/`deactivate` compatibility normalizes to current action keys such as `delete`. |
| `public.default_access_permission_key` | PASS | Returned `view_crm_lead` for CRM Lead read. |
| `public.get_access_control_targets` | PASS | Returned CRM and DocType/page/menu targets for the selected company. |
| `public.get_access_control_matrix` | PASS | Returned rights rows for CRM Lead. |
| `public.get_company_user_role_assignments` | PASS | Returned active role assignments for the selected company user. |
| `public.set_company_user_roles` | PASS | Reapplied the selected user’s existing active role set successfully. |
| `public.save_access_control_matrix` | PASS | Saved CRM Lead rights rows successfully after conflict-fix updates. |
| `public.get_company_users` | PASS | Returned users plus effective permission counts. |
| `public.current_user_has_doctype_permission` | PASS | Returned `true` for current authenticated context on CRM Lead read. |

#### Cloud compatibility fixes required during smoke test

The smoke test found and fixed real migration compatibility issues:

1. `erp_doctypes.sort_order` was referenced, but the live schema does not provide that column.
2. `public.get_company_users(uuid)` needed explicit drop/recreate semantics because its return shape changed.
3. `save_access_control_matrix()` had an ambiguous `permission_key` reference.
4. `set_company_user_roles()` needed `on conflict on constraint company_role_assignments_pkey`.
5. `save_access_control_matrix()` needed named-constraint upserts for:
   - `permissions_pkey`
   - `company_role_permissions_pkey`

These fixes are now reflected in the tracked migration file.

### 2. Authenticated browser verification

Browser verification was run locally against:

- `http://127.0.0.1:4173`
- Script: `scripts/verify_phase6_access_control.mjs`

#### Verified flow

- Login succeeds and no longer stalls on `/login`
- Access Control Manager opens
- Company selection works for `HIPPOCLOUDS.COM`
- Test role creation works
- CRM Lead target selection works
- CRM Lead `read/create/update` grants save successfully
- User role assignment page opens through normal app flow
- Role assignment to a real user works
- Effective rights preview renders and includes CRM Lead rights
- Removing and restoring the `read` grant works at the role-matrix level

#### Browser verification result

Status: **PASS with one documented limitation**

Limitation:

- The selected real user already had `view_crm_lead` through other active roles.
- Because effective rights are aggregated across all active roles, removing `read` from the test role did **not** produce a missing-access diagnostic for that user.
- The UI correctly showed:
  - role grant for `Read` became `Missing`
  - user effective access remained `Yes`
  - diagnostics stayed `Ready`

This is not an auth failure and not a broken verifier anymore. It is a valid multi-role effective-rights outcome and is now reported explicitly by the script.

Artifacts:

- `C:\tmp\phase-6-0-access-control\01-access-control-role-created.png`
- `C:\tmp\phase-6-0-access-control\03-users-role-assigned.png`
- `C:\tmp\phase-6-0-access-control\05-effective-rights-preview.png`
- `C:\tmp\phase-6-0-access-control\06-right-removed-diagnostics.png`
- `C:\tmp\phase-6-0-access-control\07-right-restored.png`

### 3. UserRoleAssignmentPage wiring

`UserRoleAssignmentPage` is now reachable in the normal app flow while preserving legacy compatibility.

Navigation path:

1. Open `Metadata Studio`
2. Open `Access Control Manager`
3. Click `Manage User Assignments`

Additional route support:

- direct route: `/users_and_roles_access_assignments`
- rendered via `DynamicRouteRenderer`
- hosted inside `UsersRolesView` as the `Access Assignments` tab
- legacy `Users` and `Roles` tabs remain intact

### 4. Test-suite triage

Earlier failures were reduced and then resolved during this phase.

| Spec | Final status | Triage |
| --- | --- | --- |
| `dashboard-kpi` | PASS | Pre-existing stale expectation. Test expected a data table for a planned module; updated to match the current placeholder behavior. |
| `auth-routes` | PASS | Pre-existing stale expectation. Test expected string navigation, while current route uses `{ pathname, search }`. |
| `auth-state` | PASS | Focused test harness issue. `LoginRoute` depends on auth context; test now mocks `useAuth`. |
| `permission-gates` | PASS | Pre-existing stale expectation. Current app hides inaccessible routes and falls back to the home state rather than showing a global AccessDenied splash. |
| `app` | PASS | No further failure after the above fixes. |

## Files Updated In Phase 6.0.1

### Frontend / verification

- `src/routes/LoginRoute.tsx`
- `src/components/UsersRolesView.tsx`
- `src/components/metadata/DynamicRouteRenderer.tsx`
- `src/components/permissions/AccessControlManagerPage.tsx`
- `src/App.tsx`
- `scripts/verify_phase6_access_control.mjs`

### Tests

- `tests/frontend/auth-routes.spec.tsx`
- `tests/frontend/auth-state.spec.tsx`
- `tests/frontend/permission-gates.spec.tsx`
- `tests/frontend/dashboard-kpi.spec.tsx`

### Database

- `supabase/migrations/0042_access_control_manager.sql`

## Command Results

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS with existing warnings only |
| `npm run test` | PASS (`14/14` files, `50/50` tests) |
| `npm run build` | PASS |
| `npm run test:simulation` | PASS |

## Remaining Gaps

1. Missing-access diagnostics are currently hard to demonstrate with a heavily privileged multi-role user because effective rights remain inherited from other active roles.
2. A dedicated low-privilege verification user would make the negative diagnostic flow easier to prove in future runs.
3. The local branch naming mismatch (`main` content, phase-branch target) should be corrected structurally in a later housekeeping pass to reduce push risk.
