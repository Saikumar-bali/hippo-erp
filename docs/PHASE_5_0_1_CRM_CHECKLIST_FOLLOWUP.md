# Phase 5.0.1: CRM Checklist Follow-up

## Objective
Stabilize the DocType completion checklist and verify CRM Lead and Opportunity DocTypes. This is a cleanup phase focusing on architectural correctness of permission repair and UX stability.

## Tasks
- [ ] Stabilize `DocTypeCompletionChecklist.tsx`: Repair module metadata fix.
- [ ] Stabilize `metadata_studio_doc_check:<doctype_key>` direct navigation.
- [ ] Verify `crm_lead` checklist passes.
- [ ] Verify `crm_opportunity` checklist passes.
- [ ] Update `scripts/verify_phase5_crm_checklist.mjs` to reflect direct navigation.

## Success Criteria
- Checklist repairs for any DocType correctly use the DocType's module, not "purchasing".
- Navigation via URL directly triggers the check.
- Simulation/verification script passes for CRM DocTypes.
