# AI Run: 2026-06-05 Phase 6.5 Permission Levels and User Permissions

Status: in progress

## Scope

Start Phase 6.5:

- permission levels on metadata DocFields
- role-level field access controls
- record-level user permission rules
- CRM Lead proof target

## Work completed

- created migration `0047_permission_levels_user_permissions.sql`
- applied migration 0047 on Supabase Cloud
- added `permlevel` support to metadata types and Field Builder
- added frontend field-access filtering to dynamic metadata pages
- added field-level permissions UI to Access Control Manager
- added user-permissions UI to User Role Assignment
- added `scripts/verify_phase6_5_permission_levels.mjs`
- re-ran:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:simulation`
  - `node scripts/provision_test_users.mjs`

## Current verification state

Automated admin-side Playwright setup is not fully stable yet.

Observed progress in the verifier:

- admin login works
- local preview build works
- CRM Lead field-level panel renders with level 0 and level 1 groups
- low-priv user provisioning works with current env values

Current blocker:

- the verifier still flakes while driving the admin UI setup path across Access Control Manager and User Permissions controls, so final browser proof is not complete yet

## Truthful status

Phase 6.5 is not complete at this checkpoint.

Do not mark:

- final browser verification as pass
- final docs as complete closeout
- branch push as Phase 6.5 complete
