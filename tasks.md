# Phase 5.0 Tasks: CRM Metadata-First Module

Active branch: `phase-2.5-metadata-engine`

Goal: Prove that Hippo ERP can create a complete business module using the metadata engine and builder workflow, without writing custom CRUD code. CRM is the best next module because its core records are normal documents, unlike GRN or Purchase Orders.

## Why CRM Before Purchase Orders

Purchase Orders are transactional. They need explicit lifecycle rules, supplier linkage, line items, status handling, GRN linkage, and later accounting integration.

CRM is a better next proof because the core CRM records can start as `generic_json` DocTypes:

- Lead
- Contact
- Account
- Opportunity
- Follow-up Task

This phase should prove that the builder-first Metadata Studio can create and run a full module from metadata.

---

## A. Docs And Review

- [x] GPT review report: `docs/ai-runs/2026-06-01_gpt-review-phase-4-9-builder-hardening.md`
- [ ] Create `docs/PHASE_5_0_CRM_METADATA_FIRST_MODULE.md`
- [ ] Create `docs/ai-runs/2026-06-01_phase-5-0-crm-metadata-first-module.md`
- [ ] Update `progress.md`

---

## B. CRM Module And Workspace Metadata

Create migration:

- [ ] `supabase/migrations/0040_crm_metadata_first_module.sql`

Seed:

- [ ] `app.erp_modules` row for `crm`
- [ ] `app.erp_workspaces` row for `crm`
- [ ] workspace sidebar/menu items for CRM DocTypes

Module:

- module_key: `crm`
- label: `CRM`
- description: `Customer relationship management using metadata-driven documents`
- active: true

Workspace:

- workspace_key: `crm`
- label: `CRM`
- active: true

---

## C. CRM DocTypes

Seed these as `generic_json` DocTypes:

### 1. Lead

- doctype_key: `crm_lead`
- label: `Lead`
- module_key: `crm`
- schema_name: `app`
- table_name: `erp_documents`
- storage_strategy: `generic_json`
- company scoped: true

Fields:

- lead_name Data required list/filter
- company_name Data list/filter
- email Data list/filter
- phone Data list/filter
- source Select list/filter: Website, Referral, Campaign, Social, Other
- status Select list/filter: New, Contacted, Qualified, Lost, Converted
- owner_name Data list/filter
- notes Text
- is_active Check list/filter default true

### 2. Contact

- doctype_key: `crm_contact`
- label: `Contact`

Fields:

- full_name Data required list/filter
- account_name Data list/filter
- email Data list/filter
- phone Data list/filter
- designation Data
- contact_type Select list/filter: Decision Maker, Influencer, User, Other
- notes Text
- is_active Check list/filter default true

### 3. Account

- doctype_key: `crm_account`
- label: `Account`

Fields:

- account_name Data required list/filter
- industry Data list/filter
- website Data
- phone Data
- city Data list/filter
- status Select list/filter: Active, Prospect, Dormant, Lost
- notes Text
- is_active Check list/filter default true

### 4. Opportunity

- doctype_key: `crm_opportunity`
- label: `Opportunity`

Fields:

- opportunity_name Data required list/filter
- account_name Data list/filter
- contact_name Data list/filter
- stage Select list/filter: Qualification, Proposal, Negotiation, Won, Lost
- expected_value Float list/filter
- expected_close_date Date list/filter
- probability Int
- notes Text
- is_active Check list/filter default true

### 5. Follow-up Task

- doctype_key: `crm_followup_task`
- label: `Follow-up Task`

Fields:

- subject Data required list/filter
- related_to Data list/filter
- due_date Date list/filter
- status Select list/filter: Open, Done, Cancelled
- priority Select list/filter: Low, Medium, High
- assigned_to Data list/filter
- notes Text
- is_active Check list/filter default true

---

## D. List Views And Form Layouts

For each CRM DocType:

- [ ] create default list view with useful columns
- [ ] create search_fields_json
- [ ] create filters_json from list/filter fields
- [ ] create default form layout with logical sections
- [ ] ensure no raw UUIDs or raw JSON show in normal UI

Suggested sections:

- Lead: Lead Details, Qualification, Notes
- Contact: Contact Details, Relationship, Notes
- Account: Account Details, Status, Notes
- Opportunity: Deal Details, Forecast, Notes
- Follow-up Task: Task Details, Assignment, Notes

---

## E. Actions, Permissions, And Grants

For each CRM DocType, create actions:

- read → `view_<doctype_key>`
- create → `create_<doctype_key>`
- update → `update_<doctype_key>`
- deactivate → `delete_<doctype_key>`

Seed permission catalog rows for all CRM permission keys.

Grant default access to:

- owner
- admin

Optional if roles exist:

- sales_manager: full access
- sales_user: view/create/update, no delete

Do not grant broadly to viewer/auditor unless an existing policy already does so.

---

## F. Workspace Items

Add active CRM workspace items:

- Leads → target `crm_lead`
- Contacts → target `crm_contact`
- Accounts → target `crm_account`
- Opportunities → target `crm_opportunity`
- Follow-up Tasks → target `crm_followup_task`

All item_type should be `doctype`.

Required permission should be the read/view permission for the DocType.

---

## G. Builder Verification

Use Metadata Studio builder screens to inspect at least two seeded DocTypes:

- [ ] `crm_lead`
- [ ] `crm_opportunity`

Verify:

- [ ] DocType Builder loads them
- [ ] Field Builder shows fields with dropdown types
- [ ] List View Builder shows columns without JSON editing
- [ ] Form Layout Builder shows sections
- [ ] Menu Builder shows CRM workspace items
- [ ] Access Builder shows permission keys and owner/admin grants
- [ ] Check / Repair passes

---

## H. Browser Verification

Verify in browser:

- [ ] CRM workspace appears in sidebar
- [ ] Leads opens
- [ ] Create Lead
- [ ] Edit Lead
- [ ] Deactivate Lead
- [ ] Opportunities opens
- [ ] Create Opportunity
- [ ] Edit Opportunity
- [ ] Deactivate Opportunity
- [ ] Search/filter works where practical
- [ ] No permission error for owner/admin

Screenshots:

- [ ] Commit screenshots if practical under `docs/ai-runs/screenshots/phase-5-0-crm/`
- [ ] If local-only, document exact local paths

---

## I. CRM Scope Documentation

Document what this proves and what remains future custom work.

Generic metadata can handle now:

- master/simple records
- basic lead/opportunity tracking
- list/filter/form UI
- owner/admin permission setup

Needs custom services later:

- email sync
- call logs integration
- lead scoring automation
- pipeline forecast dashboards
- activity timeline aggregation
- workflow automation
- conversion flow from Lead to Account/Contact/Opportunity

---

## J. Commands

Run and document:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Document known pre-existing failures separately.

---

## K. Acceptance Criteria

Phase 5.0 is complete only when:

- [ ] CRM module/workspace exists
- [ ] five CRM DocTypes exist as `generic_json`
- [ ] list views and form layouts render without raw JSON editing
- [ ] actions, permissions, and owner/admin grants exist
- [ ] CRM workspace items are visible
- [ ] Lead create/edit/deactivate works in browser
- [ ] Opportunity create/edit/deactivate works in browser
- [ ] Check / Repair passes for Lead and Opportunity
- [ ] AI run report exists

After Phase 5.0, decide between:

- Phase 5.1: CRM polish and activity timeline
- Phase 6: Purchase Order architecture
- Phase 4.10: full Metadata Studio publish wizard
