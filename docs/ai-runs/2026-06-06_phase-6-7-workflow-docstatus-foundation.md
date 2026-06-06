# AI Run: Phase 6.7 — Workflow / DocStatus Foundation

**Date:** 2026-06-06
**Phase:** 6.7
**Status:** Complete

## Goal

Add Frappe-style workflow and document status support for metadata-driven generic_json DocTypes. CRM Lead is the proof DocType. Backend enforces transitions; frontend buttons are UX only.

## What was done

1. Created migration `0051_workflow_docstatus_foundation.sql`:
   - Added docstatus, workflow_state, submitted_at, submitted_by, cancelled_at, cancelled_by, amend_count to erp_documents
   - Added workflow_key FK to erp_doctypes
   - Seeded CRM Lead workflow with 6 states and 9 transitions
   - Created 5 new RPCs for workflow management
   - Updated existing CRUD RPCs to enforce docstatus rules

2. Updated frontend API layer:
   - Added workflow methods to DocTypeApi interface
   - Implemented getWorkflowActions, applyWorkflowAction, submitDocument, cancelDocument in generic-doctype-api.ts

3. Updated DynamicDetailPage:
   - Shows docstatus badge (Draft/Submitted/Cancelled)
   - Shows workflow_state badge
   - Renders backend-provided workflow action buttons
   - Calls backend RPCs on button click and refreshes state

4. Applied migration to Supabase Cloud via Management API

5. Ran full verification:
   - Cloud: 17/17 PASS
   - Browser: 12/12 PASS
   - Typecheck: 0 errors
   - Tests: 77/77 pass
   - Build: success

## Commit

```
Phase 6.7: Workflow/DocStatus Foundation

- Migration 0051: docstatus, workflow_state columns, CRM Lead workflow, 5 new RPCs
- Backend enforces workflow transitions (erp_apply_workflow_action)
- Direct update payload cannot change docstatus/workflow_state
- Cancelled/submitted document rules enforced
- Frontend shows docstatus/workflow badges and action buttons
- Cloud verification: 17/17 PASS
- Browser verification: 12/12 PASS
```
