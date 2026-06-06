# Phase 6.7 Tasks: Workflow / DocStatus Foundation

Status: COMPLETE

## Definition of done

- [x] Backend enforces workflow transitions (not frontend-only)
- [x] Direct update payload cannot change docstatus/workflow_state
- [x] Restricted user cannot transition without permission
- [x] Cancelled/submitted document rules are enforced
- [x] CRM Lead proof workflow works end-to-end
- [x] Audit/version timeline records workflow changes
- [x] Cloud verification passes (17/17)
- [x] Browser verification passes (12/12)
- [x] No credentials committed

## Completed work

### Documentation
- [x] Create `docs/PHASE_6_7_WORKFLOW_DOCSTATUS_FOUNDATION.md`
- [x] Update `tasks.md`

### Database Migration 0051
- [x] Add `docstatus` INT column to `erp_documents` (0=Draft, 1=Submitted, 2=Cancelled)
- [x] Add `workflow_state` TEXT column to `erp_documents`
- [x] Add `submitted_at`, `submitted_by`, `cancelled_at`, `cancelled_by` columns
- [x] Add `amend_count` INT column for amendment tracking
- [x] Add `workflow_key` FK column to `erp_doctypes`
- [x] Seed CRM Lead workflow (Draft → Open → Qualified → Lost/Converted → Cancelled)
- [x] Create RPC: `erp_get_workflow_for_doctype`
- [x] Create RPC: `erp_list_workflow_actions`
- [x] Create RPC: `erp_apply_workflow_action`
- [x] Create RPC: `erp_submit_document`
- [x] Create RPC: `erp_cancel_document`
- [x] Update `erp_create_document` to set initial docstatus/workflow_state
- [x] Update `erp_update_document` to enforce docstatus rules
- [x] Update `erp_list_documents` to return docstatus/workflow_state
- [x] Update `erp_get_document` to return docstatus/workflow_state
- [x] Add `submit` and `cancel` actions to erp_doctype_actions for CRM Lead
- [x] Grant new permission keys to owner/admin roles

### Frontend API Layer
- [x] Add workflow methods to `DocTypeApi` interface in `doctype-api-map.ts`
- [x] Implement `getWorkflowActions`, `applyWorkflowAction`, `submitDocument`, `cancelDocument` in `generic-doctype-api.ts`

### Frontend UI
- [x] Update `DynamicDetailPage` to show docstatus/workflow badges
- [x] Add workflow transition buttons to `DynamicDetailPage`
- [x] Show clear error if backend rejects transition

### Verification Scripts
- [x] Create `scripts/verify_phase6_7_workflow_docstatus_cloud.mjs`
- [x] Create `scripts/verify_phase6_7_workflow_docstatus_browser.mjs`

### Verification
- [x] Run `npm run typecheck`
- [x] Run `npm run lint`
- [x] Run `npm run test`
- [x] Run `npm run build`
- [x] Apply migration to Supabase Cloud
- [x] Run cloud verification (17/17 PASS)
- [x] Run browser verification (12/12 PASS)
