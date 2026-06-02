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

- [ ] Create `docs/PHASE_5_1_CRM_POLISH_USABILITY.md`
- [ ] Create `docs/ai-runs/2026-06-02_phase-5-1-crm-polish-usability.md`
- [ ] Update `progress.md`

---

## B. CRM Workspace Usability

Improve CRM sidebar/workspace user flow:

- [ ] Ensure CRM workspace appears cleanly in sidebar
- [ ] Ensure menu item order is Leads, Accounts, Contacts, Opportunities, Follow-up Tasks
- [ ] Ensure labels are plural and user-friendly
- [ ] Ensure each CRM list opens without stale filters from another DocType
- [ ] Ensure empty states explain what to create next

---

## C. CRM Dashboard / Landing Page

Create a simple CRM landing page if practical:

- [ ] `src/components/crm/CrmDashboardPage.tsx`

Show compact cards:

- [ ] Leads count
- [ ] Opportunities count
- [ ] Open follow-up tasks count
- [ ] Won opportunities count if available

Add quick links:

- [ ] New Lead
- [ ] New Opportunity
- [ ] Open Leads
- [ ] Open Opportunities

If a custom dashboard is too much for this phase, document why and keep workspace list flow clean.

---

## D. CRM Sample Data

Create optional demo/sample records for development or verification:

- [ ] 3 sample Leads
- [ ] 2 sample Accounts
- [ ] 2 sample Contacts
- [ ] 2 sample Opportunities
- [ ] 2 sample Follow-up Tasks

Rules:

- [ ] Use Supabase Cloud-safe seed or script
- [ ] Do not duplicate samples on repeated runs
- [ ] Document whether samples are enabled or skipped

---

## E. List View Polish

For CRM list pages:

- [ ] Lead list has useful columns: Lead Name, Company, Email, Source, Status, Owner
- [ ] Opportunity list has useful columns: Opportunity, Account, Stage, Value, Close Date, Probability
- [ ] Follow-up Task list has useful columns: Subject, Related To, Due Date, Status, Priority, Assigned To
- [ ] Status fields display clearly
- [ ] Search works after switching between CRM DocTypes
- [ ] Filters are useful and not confusing

---

## F. Form UX Polish

For CRM forms:

- [ ] Required fields show clearly
- [ ] Select fields use dropdowns
- [ ] Notes fields are comfortable textareas
- [ ] Form section order makes sense
- [ ] Create/edit/deactivate still works

---

## G. Builder Proof

Use Metadata Studio builders to inspect and adjust CRM:

- [ ] Field Builder loads `crm_lead`
- [ ] List View Builder loads `crm_lead`
- [ ] Form Layout Builder loads `crm_lead`
- [ ] Access Builder loads `crm_lead`
- [ ] Check / Repair passes for `crm_lead`
- [ ] Check / Repair passes for `crm_opportunity`

---

## H. Browser Verification

Verify:

- [ ] CRM workspace visible
- [ ] Leads list opens
- [ ] Lead create/edit/deactivate works
- [ ] Opportunities list opens
- [ ] Opportunity create/edit/deactivate works
- [ ] Follow-up Tasks opens
- [ ] Switching Lead → Opportunity does not keep stale filters
- [ ] No permission errors for owner/admin
- [ ] No raw JSON shown in normal CRM use

Screenshots:

- [ ] Commit screenshots if practical under `docs/ai-runs/screenshots/phase-5-1-crm-polish/`
- [ ] If local-only, document paths

---

## I. Commands

Run and document:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Document known existing test failures separately.

---

## J. Acceptance

Phase 5.1 is complete only when:

- [ ] CRM feels usable from the sidebar
- [ ] Lead and Opportunity flows are polished and verified
- [ ] Follow-up Tasks opens cleanly
- [ ] CRM list/form metadata is polished
- [ ] Builder proof still passes
- [ ] AI run report exists

After Phase 5.1, choose:

- Phase 6: Purchase Order architecture
- Phase 5.2: CRM activity timeline
- Phase 4.10: full Metadata Studio publish wizard
