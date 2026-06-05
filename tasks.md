# Phase 6.5 Tasks: Permission Levels and User Permissions Foundation

Active branch: `phase-2.5-metadata-engine`

Goal: strengthen role management toward Frappe-like behavior by adding field-level permission levels and record-level user permissions for metadata-driven DocTypes, using CRM Lead as the proof target.

Do not start Module Builder, Fleet Management, Purchase Orders, Client Scripts, Report Builder, Workflow, or PDF generation from this task file. Module Builder remains deferred outside this phase.

## Current status

Phase 6.5 is active and not complete yet.

- [x] Created `supabase/migrations/0047_permission_levels_user_permissions.sql`
- [x] Applied Phase 6.5 migration on Supabase Cloud
- [x] Added `permlevel` support to metadata field types and builder forms
- [x] Added generic field-access hook for metadata-driven pages
- [x] Added frontend field filtering/hiding in dynamic list, detail, and form pages
- [x] Added Access Control Manager field-level permissions UI section
- [x] Added User Permissions panel to User Role Assignment
- [x] Added `scripts/verify_phase6_5_permission_levels.mjs`
- [ ] Finish stable end-to-end Playwright proof for admin setup + restricted-user CRM Lead behavior
- [ ] Update final docs with complete PASS/FAIL evidence
- [ ] Push final Phase 6.5 branch commit after verification is complete

## A. Database + Enforcement

- [x] Add `permlevel integer not null default 0` to `app.erp_docfields`
- [x] Add permlevel validation check
- [x] Seed CRM Lead sensitive fields to level 1
- [x] Add role-level DocType permlevel table
- [x] Add record-level user permission table
- [x] Add RPCs for role permlevels and user permission rules
- [x] Extend generic document RPCs for field masking and record filtering
- [ ] Re-verify create/update blocking on level-1 fields through automated browser proof

## B. Generic UI + Access Surfaces

- [x] Hide unreadable fields in dynamic list/detail/form rendering
- [x] Block non-writable fields in dynamic form submission path
- [x] Keep list filters/search scoped to readable fields
- [x] Preserve CRM Lead and CRM Opportunity CRUD codepaths
- [ ] Re-check CRM Opportunity against the new generic access filtering path
- [ ] Add explicit field-level editing support to advanced metadata management flows if needed later

## C. Access Control Manager UI

- [x] Show field-level permissions section for selected DocType
- [x] Show CRM Lead level 0 and level 1 grouping in UI
- [x] Explain level 0 vs level 1 in compact professional copy
- [ ] Complete stable automated verification that owner/admin can grant/revoke level 1 from the browser

## D. User Permissions UI

- [x] Add compact user-permissions panel to user-role assignment screen
- [x] Allow DocType selection
- [x] Allow field selection
- [x] Allow allowed-value entry
- [x] Allow read/write/active toggles
- [ ] Complete stable automated verification that rules can be created and toggled from the browser

## E. CRM Lead Proof

- [x] Reuse `owner_name` as the record-restriction proof field
- [x] Seed CRM Lead sensitive fields as level 1
- [ ] Create/verify two owner-separated CRM Lead records under automated proof
- [ ] Verify restricted user only sees matching records under automated proof
- [ ] Verify restricted user cannot read level-1 CRM Lead fields under automated proof

## F. Validation

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run test:simulation`
- [x] `node scripts/provision_test_users.mjs`
- [ ] `node scripts/verify_phase6_5_permission_levels.mjs`

## Acceptance

Phase 6.5 is complete only when:

- [x] migration 0047 exists and is applied on Supabase Cloud
- [x] field-level access surfaces exist in app UI
- [x] user-permission management UI exists
- [ ] restricted-user browser proof passes end-to-end
- [ ] screenshots/results JSON exist for Phase 6.5 verifier
- [ ] tasks/progress/docs are finalized truthfully
- [ ] branch is pushed after verification passes
