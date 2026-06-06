# Phase 6.7: Workflow / DocStatus Foundation

## Summary

Adds Frappe-style workflow and document status support for metadata-driven generic_json DocTypes. CRM Lead is the proof DocType. Backend enforces transitions; frontend buttons are UX only.

## What was done

### Database (Migration 0051)
- Added `docstatus` (INT, 0=Draft/1=Submitted/2=Cancelled), `workflow_state` (TEXT), `submitted_at`, `submitted_by`, `cancelled_at`, `cancelled_by`, `amend_count` columns to `erp_documents`
- Added `workflow_key` FK to `erp_doctypes`
- Seeded CRM Lead workflow: draft → open → qualified → lost/converted → cancelled
- Created 5 new RPCs:
  - `erp_get_workflow_for_doctype` — returns workflow config, states, transitions
  - `erp_list_workflow_actions` — returns allowed actions for a document based on current state + permissions
  - `erp_apply_workflow_action` — backend-enforced workflow transition
  - `erp_submit_document` — submit for submittable DocTypes
  - `erp_cancel_document` — cancel document (sets docstatus=2)
- Updated `erp_create_document` to set initial workflow_state
- Updated `erp_update_document` to enforce docstatus rules (only draft can be updated)
- Updated `erp_list_documents` and `erp_get_document` to return docstatus/workflow_state
- Added submit/cancel actions to erp_doctype_actions for CRM Lead

### Frontend
- Added workflow methods to `DocTypeApi` interface: `getWorkflow`, `getWorkflowActions`, `applyWorkflowAction`, `submitDocument`, `cancelDocument`
- Implemented all workflow methods in `generic-doctype-api.ts`
- Updated `DynamicDetailPage` to show docstatus/workflow badges and render workflow action buttons
- Workflow buttons call backend RPCs and refresh the document state after transition

## Verification
- Cloud verification: 17/17 PASS
- Browser verification: 12/12 PASS
- TypeScript: 0 errors
- ESLint: 0 new errors
- Tests: 77/77 pass
- Build: success

## Files created/modified
- `supabase/migrations/0051_workflow_docstatus_foundation.sql` (new)
- `src/components/metadata/doctype-api-map.ts` (updated interface)
- `src/lib/metadata/generic-doctype-api.ts` (added workflow methods)
- `src/components/metadata/DynamicDetailPage.tsx` (workflow UI)
- `scripts/verify_phase6_7_workflow_docstatus_cloud.mjs` (new)
- `scripts/verify_phase6_7_workflow_docstatus_browser.mjs` (new)
