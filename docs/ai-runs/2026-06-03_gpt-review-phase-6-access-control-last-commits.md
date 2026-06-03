# GPT Review Report: Phase 6 Access Control Last Commits

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commits

- `8ccb399` — Start phase 6 access control manager tasks
- `1a7eb4f` — Add Phase 6.0 access control docs and verification
- `5cfc1b1` — Fix Phase 6 access control migration compatibility

## Review Result

Phase 6.0 is useful, but it should not be treated as fully complete yet.

The implementation direction is good: it reuses the existing company-role tables, adds matrix-oriented RPCs, adds an Access Control Manager UI, improves diagnostics, and avoids creating duplicate role tables.

However, the last commits still show several risky gaps:

1. Full authenticated browser verification did not complete.
2. The report marks Phase 6.0 complete even though login/browser verification was blocked.
3. The full frontend test suite still has 5 failures.
4. The new multi-role assignment page exists, but is not yet the default Users/Roles path.
5. The final compatibility commit only fixes one SQL ambiguity in `company_role_permissions`; it does not prove the whole migration is safe on Supabase Cloud.

## What Is Good

### Existing schema reuse

The Phase 6 report says the implementation reused the existing tables:

- `app.permissions`
- `app.role_permission_grants`
- `app.company_roles`
- `app.company_role_permissions`
- `app.company_role_assignments`
- `app.tenant_members`
- `app.profiles`
- `app.erp_doctype_actions`
- `app.erp_workspace_items`

That is the correct decision. Duplicating role tables would have been a bad architecture mistake.

### Migration concept

The migration adds useful RPCs and helpers:

- `public.normalize_access_action_key`
- `public.default_access_permission_key`
- `public.get_access_control_targets`
- `public.get_access_control_matrix`
- `public.get_company_user_role_assignments`
- `public.set_company_user_roles`
- `public.save_access_control_matrix`

### UI direction

The new UI files are the right components:

- `AccessControlManagerPage.tsx`
- `UserRoleAssignmentPage.tsx`
- `PermissionMatrix.tsx`
- `access-control.ts`
- `access-control-api.ts`

### Compatibility patch

Commit `5cfc1b1` fixed an SQL delete ambiguity by aliasing `app.company_role_permissions` as `crp`. This is a valid patch, but it is too small to consider the whole phase verified.

## Problems / Risks

### 1. Phase status is overstated

The docs mark Phase 6.0 as complete, but the browser verification section says the live authenticated walkthrough could not be completed because login did not leave `/login`.

That means the correct status is:

```text
Phase 6.0: implementation mostly complete, verification incomplete
```

### 2. Browser verification is not optional for access control

Access control is not just a UI page. It must prove that a role grant changes what a user can do. The required browser flow should prove:

- create/select test role
- grant CRM Lead read/create/update
- assign role to a user
- verify effective permissions
- remove one permission
- verify the UI blocks or diagnoses the missing permission
- restore permission

This is not proven yet.

### 3. Test failures are becoming technical debt

The report says `npm run test` still has 5 failures in auth/dashboard/permission-gate/app flows. Those areas are directly related to access and login, so calling them unrelated is not safe.

### 4. User branch state looks wrong

The user terminal showed:

```text
HEAD -> main, origin/phase-2.5-metadata-engine
```

That means the local branch name may now be `main` while tracking/pulling from `origin/phase-2.5-metadata-engine`. CLI-AI should stop and confirm branch state before pushing further.

## Decision

Do not proceed to Phase 6.1 Theme Studio.

Run a focused stabilization phase first:

```text
Phase 6.0.1: Access Control Verification + Login/Test Stabilization
```

## Required Next Work

1. Confirm local branch state and ensure work is on `phase-2.5-metadata-engine`.
2. Apply migration 0042 on Supabase Cloud cleanly.
3. Run SQL smoke tests for every new RPC.
4. Fix or clearly triage the login issue blocking Playwright.
5. Complete authenticated browser verification of Access Control Manager.
6. Make `UserRoleAssignmentPage` reachable from the main Users/Roles or Access Control UI.
7. Re-run and triage the 5 frontend test failures.
8. Update Phase 6.0 report status from complete to verified only after proof exists.

## Recommended Next Phase

Phase 6.0.1 should be a correction/verification phase, not a feature phase.
