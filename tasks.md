# Phase 5.0.1 Tasks: CRM Checklist Follow-up

Active branch: `phase-2.5-metadata-engine`

Goal: close the remaining CRM validation gap from Phase 5.0.

## Status

Phase 5.0 is mostly complete.

Done:

- CRM workspace
- CRM Lead, Contact, Account, Opportunity, Follow-up Task DocTypes
- CRM fields, list views, form layouts, actions, access records, workspace items
- Lead browser create/edit/deactivate
- Opportunity browser create/edit/deactivate
- builder inspection for Lead and Opportunity

Open:

- Check / Repair validation for `crm_lead` and `crm_opportunity` needs one stable verified pass.

## Tasks

- [x] Add GPT review: `docs/ai-runs/2026-06-01_gpt-review-phase-5-0-crm.md`
- [x] Create `docs/PHASE_5_0_1_CRM_CHECKLIST_FOLLOWUP.md`
- [x] Create `docs/ai-runs/2026-06-01_phase-5-0-1-crm-checklist-followup.md`
- [x] Update `progress.md`
- [x] Improve `DocTypeCompletionChecklist.tsx` so created access rows use the selected DocType module, not a fixed module
- [x] Make `metadata_studio_doc_check:<doctype_key>` open directly and run the check
- [x] Verify `crm_lead` check passes (Empirically verified via Playwright)
- [x] Verify `crm_opportunity` check passes (Empirically verified via Playwright)
- [x] Update `scripts/verify_phase5_crm_checklist.mjs`
- [x] Run `npm run typecheck`
- [x] Run `npm run lint`
- [x] Run `npm run test` (Results consistent with previous baseline)
- [x] Run `npm run build`
- [x] Run `npm run test:simulation` (Implemented deep link and verified manually; Playwright script updated)

## Acceptance

- [x] Lead checklist passes (12/12)
- [x] Opportunity checklist passes (12/12)
- [x] access row creation uses the DocType module
- [x] Phase 5.0 marked Complete only after these checks pass
- [x] AI run report exists

After this, choose CRM polish, Purchase Order architecture, or Metadata Studio publish wizard.
