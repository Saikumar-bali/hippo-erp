# Phase 5.0 AI Run: CRM Metadata-First Module

## Branch

- `phase-2.5-metadata-engine`

## Objective

Implement CRM as a metadata-first module using generic document storage only, without custom CRM RPCs or ERP transaction logic.

## Files Changed

- `supabase/migrations/0040_crm_metadata_first_module.sql`
- `src/components/metadata/DynamicListPage.tsx`
- `progress.md`
- `tasks.md`
- `docs/PHASE_5_0_CRM_METADATA_FIRST_MODULE.md`

Verification helpers used during the run:

- `scripts/verify_phase5_crm.mjs`
- `scripts/verify_phase5_crm_checklist.mjs`

## Migration Applied

Supabase project:

- `bhqgszzvemejfbgndtnf`

Result:

- `0040_crm_metadata_first_module` applied successfully

Follow-up live data cleanup also corrected the CRM follow-up task workspace item key to:

- `crm_followup_task`

## Seeded CRM Metadata

Added CRM module/workspace and these `generic_json` DocTypes:

- `crm_lead`
- `crm_contact`
- `crm_account`
- `crm_opportunity`
- `crm_followup_task`

For each DocType, the phase seeded:

- fields
- default list views
- default form layouts
- standard read/create/update/deactivate actions
- permission catalog keys
- owner/admin grants
- workspace menu items

## Browser Verification

Passed:

- CRM workspace visible in sidebar
- Leads page opens
- Lead create/edit/deactivate works
- Opportunities page opens
- Opportunity create/edit/deactivate works
- No owner/admin permission error shown
- Builder inspection works for `crm_lead` and `crm_opportunity`
  - DocType Builder
  - Field Builder
  - List View Builder
  - Form Layout Builder
  - Workspace Menu Builder
  - Access Builder

Local-only screenshots:

- `C:\tmp\phase-5-0-crm`

Not fully completed under automation:

- `Check / Repair` pass for `crm_lead` and `crm_opportunity`

The builders and seeded metadata loaded correctly, but the Builder Home / Check & Repair entry was flaky under repeated Playwright transitions, so this remains an honest follow-up rather than a false pass.

## Additional Code Fix

Updated `src/components/metadata/DynamicListPage.tsx` to reset list state when changing DocTypes:

- clears `search`
- clears `filterValues`
- resets pagination
- clears link-label cache

Why:

- without this, a Lead search/filter could persist into Opportunities and make valid Opportunity records appear missing even though the save succeeded

## Command Results

- `npm run typecheck` -> pass
- `npm run lint` -> pass with 44 warnings
- `npm run test` -> 44 passed, 6 failed
- `npm run build` -> pass
- `npm run test:simulation` -> pass

## Known Test Failures

Pre-existing failing frontend suites remain:

- `tests/frontend/auth-routes.spec.tsx`
- `tests/frontend/auth-state.spec.tsx`
- `tests/frontend/dashboard-kpi.spec.tsx`
- `tests/frontend/permission-gates.spec.tsx`
- `tests/frontend/users-roles.spec.tsx`

## Remaining Gap

- run one clean manual browser pass for `Check / Repair DocType` on:
  - `crm_lead`
  - `crm_opportunity`
