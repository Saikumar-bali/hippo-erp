# GPT Review Report: Phase 5.0 CRM Metadata-First Module

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commit

- `da63bf921370962845bbdb1d4a016476b0fe4031` — Implement Phase 5.0 CRM metadata-first module

## Files Reviewed

- `supabase/migrations/0040_crm_metadata_first_module.sql`
- `docs/PHASE_5_0_CRM_METADATA_FIRST_MODULE.md`
- `docs/ai-runs/2026-06-01_phase-5-0-crm-metadata-first-module.md`
- `progress.md`
- `tasks.md`
- `src/components/metadata/DynamicListPage.tsx`
- `scripts/verify_phase5_crm.mjs`
- `scripts/verify_phase5_crm_checklist.mjs`
- `src/components/metadata-studio/DocTypeCompletionChecklist.tsx`

## Review Result

Phase 5.0 is mostly complete, but not fully complete.

The main CRM module is implemented and verified enough to call the metadata-first CRM proof successful. However, one acceptance item remains open: Check / Repair did not cleanly pass for `crm_lead` and `crm_opportunity` under the documented automation path.

## What Is Complete

### CRM metadata seed

Migration `0040_crm_metadata_first_module.sql` seeds:

- CRM module
- CRM workspace
- five `generic_json` DocTypes
- fields
- list views
- form layouts
- actions
- permissions
- owner/admin grants
- workspace items

Seeded DocTypes:

- `crm_lead`
- `crm_contact`
- `crm_account`
- `crm_opportunity`
- `crm_followup_task`

### Browser CRUD

The AI run report documents browser verification for:

- CRM workspace visible
- Leads opens
- Lead create/edit/deactivate works
- Opportunities opens
- Opportunity create/edit/deactivate works
- no owner/admin permission error
- builder inspection for `crm_lead` and `crm_opportunity`

### Generic renderer fix

`DynamicListPage` now resets search, filters, pagination, link-label cache, and selection state when switching DocTypes. This is important because stale Lead filters were hiding Opportunity records.

## What Is Not Complete

### Check / Repair is still flaky

The task file itself still has this unchecked:

```text
Check / Repair passes
```

The AI run report honestly says the Check / Repair pass for `crm_lead` and `crm_opportunity` was not fully completed under automation.

This means Phase 5.0 should not be marked fully complete until that specific path is stabilized or verified cleanly.

## Additional Risk Found

`DocTypeCompletionChecklist` currently creates missing permissions with hardcoded module metadata:

```text
module_key = purchasing
module_label = Purchasing
```

That is wrong for CRM or any non-purchasing custom DocType. The repair tool should derive module_key/module_label from the selected DocType metadata.

This may not break seeded CRM when permissions already exist, but it is a framework bug in the repair path.

## Decision

Do not move to Purchase Orders, CRM polish, or activity timeline yet.

Proceed to Phase 5.0.1: CRM Check / Repair Stabilization.

## Phase 5.0.1 Must Fix

1. Stabilize Check / Repair navigation and automation for `crm_lead` and `crm_opportunity`.
2. Fix hardcoded Purchasing metadata in permission repair.
3. Add a direct route/link for `metadata_studio_doc_check:<doctype_key>` from builder inspection screens if needed.
4. Verify 12-pass checklist for both CRM DocTypes.
5. Update progress from Mostly complete to Complete only after this passes.
