# Phase 6.3 Tasks: Print Format Foundation

Active branch: `phase-2.5-metadata-engine`

Goal: add a safe, metadata-driven print foundation for normal DocTypes. Start with CRM Lead and CRM Opportunity. Do not start Purchase Orders, Client Scripts, Report Builder, Workflow, or PDF generation yet.

## Current status

Phase 6.2 and 6.2.1 are accepted:

- Export/import foundation exists for metadata-driven DocTypes
- CRM Lead and Opportunity export/import browser verification passed
- browser verification now uses environment variables only
- screenshot/result proof exists

## Why this phase exists

ERP systems need printable documents and clean page output:

- print a CRM Lead summary
- print an Opportunity summary
- later print GRNs, Purchase Orders, Invoices, and reports
- apply company logo and branding
- control who can print

This phase should create the foundation only. Avoid complex HTML scripting and avoid PDF generation for now.

---

## A. Docs & Setup
- [x] Create `docs/PHASE_6_3_PRINT_FORMAT_FOUNDATION.md`
- [x] Create `docs/ai-runs/2026-06-04_phase-6-3-print-format-foundation.md`
- [x] Update `progress.md`

## B. Permission model
- [x] Support `print_<doctype_key>` permissions
- [x] Seed permissions for `crm_lead`, `crm_opportunity`
- [x] Grant to Owner/Admin roles
- [x] Seed default print formats for Leads and Opportunities

## C. Database & Model
- [x] Create migration `0045_print_format_foundation.sql`
- [x] Support `print_<doctype_key>` permissions
- [x] Seed permissions for `crm_lead`, `crm_opportunity`
- [x] Grant to Owner/Admin roles
- [x] Seed default print formats for Leads and Opportunities

## D. Frontend Core
- [x] Create `src/lib/print/print-types.ts`
- [x] Create `src/lib/print/print-format-api.ts`
- [x] Create `src/components/print/PrintRenderer.tsx`
- [x] Create `src/components/print/PrintPreviewPage.tsx`
- [x] Integrate Print button in `DynamicDetailPage`
- [x] Register routes and virtual items

## E. Optional Builder
- [x] Create `src/components/print/PrintFormatBuilderPage.tsx`
- [x] Add link to Metadata Studio home

## F. Verification & Quality
- [x] Browser verify: CRM Lead Print button visible
- [x] Browser verify: CRM Lead Print preview opens
- [x] Browser verify: CRM Lead Branding and sections visible
- [x] Browser verify: CRM Opportunity Print button visible
- [x] Browser verify: CRM Opportunity Print preview opens
- [x] Browser verify: Browser Print button exists
- [x] Unit tests: Print format helpers and renderer
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run test:simulation`

---

## G. Acceptance

Phase 6.3 is complete only when:

- [x] print permission keys exist and owner/admin grants exist
- [x] print format metadata table exists
- [x] default CRM Lead and Opportunity print formats exist
- [x] Print button appears on permitted metadata-driven detail pages
- [x] Print Preview renders CRM Lead and Opportunity cleanly
- [x] browser print action is available
- [x] no unsafe scripts or arbitrary HTML execution
- [x] strict browser verification is documented
- [x] tests and command results are documented
- [x] AI run report exists

After Phase 6.3, recommended next phase:

- Phase 6.3.1: Print Format Builder polish and PDF strategy
