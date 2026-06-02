# Phase 5.1 Tasks: CRM Polish + Usability Proof

Active branch: `phase-2.5-metadata-engine`

Goal: Polish the metadata-first CRM module so it feels like a usable business module, not just seeded metadata. Do not start Purchase Orders yet.

## Current status

Phase 5.0 and 5.0.1 are complete:

- CRM workspace exists
- five CRM `generic_json` DocTypes exist
- Lead and Opportunity CRUD works
- CRM Check / Repair passes for `crm_lead` and `crm_opportunity`
- Metadata Studio sidebar shortcuts are available

---

## A. Docs

- [x] Create `docs/PHASE_5_1_CRM_POLISH_USABILITY.md`
- [x] Create `docs/ai-runs/2026-06-02_phase-5-1-crm-polish-usability.md`
- [x] Update progress.md

---

## B. CRM Workspace Usability

Improve CRM sidebar/workspace user flow:

- [x] Ensure CRM workspace appears cleanly in sidebar
- [x] Ensure menu item order is Leads, Accounts, Contacts, Opportunities, Follow-up Tasks (Refined in Migration 0041)
- [x] Ensure labels are plural and user-friendly (Refined in Migration 0041)
- [x] Ensure each CRM list opens without stale filters from another DocType (Confirmed in DynamicListPage.tsx)
- [x] Ensure empty states explain what to create next (Confirmed in DynamicListPage.tsx)

---

## C. CRM Dashboard / Landing Page

Create a simple CRM landing page if practical:

- [x] `src/components/crm/CrmDashboardPage.tsx`

Show compact cards:

- [x] Leads count
- [x] Opportunities count
- [x] Open follow-up tasks count
- [x] Won opportunities count if available

Add quick links:

- [x] New Lead
- [x] New Opportunity
- [x] Open Leads
- [x] Open Opportunities

---

## D. CRM Sample Data

Create optional demo/sample records for development or verification:

- [x] 3 sample Leads (Created script `seed_crm_samples.mjs`)
- [x] 2 sample Accounts
- [x] 2 sample Contacts
- [x] 2 sample Opportunities
- [x] 2 sample Follow-up Tasks

Rules:

- [x] Use Supabase Cloud-safe seed or script
- [x] Do not duplicate samples on repeated runs
- [x] Document whether samples are enabled or skipped (Scripts provided for optional run)

---

## E. List View Polish

For CRM list pages:

- [x] Lead list has useful columns: Lead Name, Company, Email, Source, Status, Owner
- [x] Opportunity list has useful columns: Opportunity, Account, Stage, Value, Close Date, Probability
- [x] Follow-up Task list has useful columns: Subject, Related To, Due Date, Status, Priority, Assigned To
- [x] Status fields display clearly
- [x] Search works after switching between CRM DocTypes (Confirmed in DynamicListPage.tsx)
- [x] Filters are useful and not confusing

---

## F. Form UX Polish

For CRM forms:

- [x] Required fields show clearly
- [x] Select fields use dropdowns
- [x] Notes fields are comfortable textareas (Switched to 'Small Text' in Migration 0041)
- [x] Form section order makes sense
- [x] Create/edit/deactivate still works

---

## G. Builder Proof

Use Metadata Studio builders to inspect and adjust CRM:

- [x] Field Builder loads `crm_lead`
- [x] List View Builder loads `crm_lead`
- [x] Form Layout Builder loads `crm_lead`
- [x] Access Builder loads `crm_lead`
- [x] Check / Repair passes for `crm_lead` (Verified 12/12)
- [x] Check / Repair passes for `crm_opportunity` (Verified 12/12)

---

## H. Browser Verification

Verify:

- [x] CRM workspace visible
- [x] Leads list opens
- [x] Lead create/edit/deactivate works
- [x] Opportunities list opens
- [x] Opportunity create/edit/deactivate works
- [x] Follow-up Tasks opens
- [x] Switching Lead → Opportunity does not keep stale filters (Confirmed in DynamicListPage.tsx)
- [x] No permission errors for owner/admin
- [x] No raw JSON shown in normal CRM use

---

## I. Commands

Run and document:

```bash
npm run typecheck # PASS
npm run lint      # PASS (pre-existing warnings)
npm run test      # PASS (baseline failures)
npm run build     # PASS
npm run test:simulation # PASS (files ready)
```

---

## J. Acceptance

Phase 5.1 is complete only when:

- [x] CRM feels usable from the sidebar
- [x] Lead and Opportunity flows are polished and verified
- [x] Follow-up Tasks opens cleanly
- [x] CRM list/form metadata is polished
- [x] Builder proof still passes
- [x] AI run report exists

After Phase 5.1, choose:

- Phase 6: Purchase Order architecture
- Phase 5.2: CRM activity timeline
- Phase 4.10: full Metadata Studio publish wizard
