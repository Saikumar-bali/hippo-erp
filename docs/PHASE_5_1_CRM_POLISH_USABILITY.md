# Phase 5.1: CRM Polish & Usability

## Objective
Polish the metadata-first CRM module to ensure it feels like a high-quality business module. This includes sidebar organization, user-friendly labels, a dedicated dashboard, refined list/form metadata, and verification via Metadata Studio builders.

## Requirements

### 1. CRM Workspace Polish
- Sidebar organization: Leads, Accounts, Contacts, Opportunities, Follow-up Tasks.
- Plural, user-friendly labels.
- Clean filter state when switching between DocTypes.

### 2. CRM Dashboard
- New component: `src/components/crm/CrmDashboardPage.tsx`.
- Metrics: Leads count, Opportunities count, Open follow-up tasks count, Won opportunities count.
- Quick links for creation and browsing.

### 3. CRM List View Polish
- **Leads:** Lead Name, Company, Email, Source, Status, Owner.
- **Opportunities:** Opportunity, Account, Stage, Value, Close Date, Probability.
- **Follow-up Tasks:** Subject, Related To, Due Date, Status, Priority, Assigned To.

### 4. CRM Form Polish
- Clear required fields.
- Dropdown select fields.
- Comfortable textarea for notes.
- Logical section organization.

### 5. Builder Verification
- Proof that `crm_lead` loads in Field, List, Form, and Access builders.
- Check / Repair passing for `crm_lead` and `crm_opportunity`.

## Success Criteria
- CRM module is polished and usable from the sidebar.
- No stale filters when navigating.
- Builders correctly handle CRM metadata.
- Standard project commands (typecheck, lint, test, build) pass.
