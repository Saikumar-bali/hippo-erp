# Phase 6.0 Tasks: Access Control Manager Foundation

Active branch: `phase-2.5-metadata-engine`

Goal: build the company-level access control foundation before adding more ERP transaction modules.

## Why this phase

Phase 5.1 polished CRM. The next gap is platform security and administration. A company can have many roles and many users, and each role needs clear rights for each DocType, page, report, print, import, and export action.

Do not start Purchase Orders yet.

---

## A. Docs

- [x] Create `docs/REMAINING_FRAPPE_GAP_ROADMAP.md`
- [ ] Create `docs/PHASE_6_0_ACCESS_CONTROL_MANAGER.md`
- [ ] Create `docs/ai-runs/2026-06-02_phase-6-0-access-control-manager.md`
- [ ] Update `progress.md`

---

## B. Inspect existing schema

Before coding, inspect current tables and migrations for:

- [ ] users
- [ ] roles
- [ ] permission catalog
- [ ] company membership
- [ ] role grants
- [ ] company or tenant id usage

Document actual table names in the AI run report. Do not create duplicate tables if existing tables can be extended safely.

---

## C. Data model

Create migration if needed:

- [ ] `supabase/migrations/0042_access_control_manager.sql`

Support:

- [ ] company roles
- [ ] user role assignment per company
- [ ] DocType rights matrix
- [ ] page/menu/report rights
- [ ] rights for read, create, update, delete, submit, cancel, print, export, import, report
- [ ] owner/admin default setup

Keep compatibility with current permission checks.

---

## D. UI

Create:

- [ ] `src/components/permissions/AccessControlManagerPage.tsx`
- [ ] `src/components/permissions/UserRoleAssignmentPage.tsx`
- [ ] `src/components/permissions/PermissionMatrix.tsx`

Required UX:

- [ ] select company
- [ ] select or create role
- [ ] select module or DocType
- [ ] edit matrix of rights
- [ ] save role changes
- [ ] assign users to roles
- [ ] show effective rights for selected user
- [ ] show clear diagnostics for missing access

---

## E. Metadata Studio integration

Update:

- [ ] Access Builder links to Access Control Manager
- [ ] Check / Repair explains where to fix missing grants
- [ ] Metadata Studio home exposes access management clearly

---

## F. Better error messages

Improve UI errors so missing access tells the user what is missing and where to fix it.

Example:

```text
Access required: view_crm_lead
Open Access Control Manager and grant this right to the user role.
```

---

## G. Verification

Browser verify:

- [ ] create a test role
- [ ] grant CRM Lead read/create/update
- [ ] assign role to a user or simulate effective rights
- [ ] show effective rights
- [ ] remove one right and confirm diagnostics explain the missing right
- [ ] restore the right

---

## H. Commands

Run and document:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

---

## I. Acceptance

Phase 6.0 is complete only when:

- [ ] access control architecture doc exists
- [ ] current schema is documented
- [ ] manager UI exists
- [ ] user-role assignment UI exists or limitation documented
- [ ] matrix supports core right types
- [ ] Metadata Studio links are updated
- [ ] error messages are actionable
- [ ] browser verification is documented
- [ ] AI run report exists

Next recommended phase after this: Phase 6.1 Company Branding / Theme Studio.
