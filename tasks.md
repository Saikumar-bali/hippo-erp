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

## A. Docs

- [x] GPT review: `docs/ai-runs/2026-06-04_gpt-review-phase-6-2-1-secure-verification.md`
- [ ] Create `docs/PHASE_6_3_PRINT_FORMAT_FOUNDATION.md`
- [ ] Create `docs/ai-runs/2026-06-04_phase-6-3-print-format-foundation.md`
- [ ] Update `progress.md`

---

## B. Permission model

Support print permission keys:

- [ ] `print_<doctype_key>`

Seed or repair for proof DocTypes:

- [ ] `print_crm_lead`
- [ ] `print_crm_opportunity`

Grant owner/admin by default.

Update Access Control Manager if needed so Print appears in the rights matrix and can be granted/revoked.

---

## C. Print format data model

Create migration if needed:

- [ ] `supabase/migrations/0045_print_format_foundation.sql`

Add a metadata table for print formats, for example:

- [ ] `app.erp_print_formats`

Suggested fields:

- [ ] id uuid primary key
- [ ] company_id / tenant_id nullable or scoped consistently with existing schema
- [ ] doctype_key text not null
- [ ] format_key text not null
- [ ] label text not null
- [ ] is_default boolean default false
- [ ] is_active boolean default true
- [ ] layout_json jsonb not null
- [ ] header_json jsonb default '{}'
- [ ] footer_json jsonb default '{}'
- [ ] created_at / updated_at

Rules:

- [ ] allow one active default format per company/doctype where practical
- [ ] keep format layout declarative JSON, not arbitrary scripts
- [ ] no unrestricted JavaScript
- [ ] no unsafe HTML execution in this phase

---

## D. Print render foundation

Create:

- [ ] `src/lib/print/print-types.ts`
- [ ] `src/lib/print/print-format-api.ts`
- [ ] `src/components/print/PrintPreviewPage.tsx`
- [ ] `src/components/print/PrintRenderer.tsx`

Required:

- [ ] load DocType metadata
- [ ] load document data
- [ ] load default print format
- [ ] render company branding/logo if available
- [ ] render title/document label
- [ ] render field sections from print layout
- [ ] render footer metadata such as printed date
- [ ] use browser print via `window.print()` button
- [ ] no PDF generation yet

---

## E. Default print formats for CRM

Seed default print formats for:

- [ ] `crm_lead`
- [ ] `crm_opportunity`

Lead print sections:

- [ ] Lead Details: lead_name, company_name, email, phone
- [ ] Qualification: source, status, owner_name
- [ ] Notes: notes

Opportunity print sections:

- [ ] Deal Details: opportunity_name, account_name, contact_name
- [ ] Forecast: stage, expected_value, expected_close_date, probability
- [ ] Notes: notes

---

## F. Dynamic page integration

Update metadata-driven pages:

- [ ] Add Print button on DynamicDetailPage for metadata-driven DocTypes
- [ ] visible only with `print_<doctype_key>` permission
- [ ] route to print preview page
- [ ] do not show for transaction pages unless explicitly supported later

Suggested route format:

```text
print:<doctype_key>:<document_id>
```

or another clear existing route convention.

---

## G. Print format builder light

Create a simple management page if practical:

- [ ] `src/components/print/PrintFormatBuilderPage.tsx`

Scope:

- [ ] list print formats
- [ ] select DocType
- [ ] create/edit label
- [ ] choose visible fields/sections from DocFields
- [ ] set default format
- [ ] preview format

If too much for this phase, seed CRM formats and document builder as Phase 6.3.1.

---

## H. Browser verification rules

Use Playwright or Chrome DevTools MCP only.

Rules:

- [ ] use environment variables only for login values
- [ ] no sensitive values in scripts/docs/logs
- [ ] produce screenshots/logs/result JSON
- [ ] browser script exits non-zero on failed checks

Verify:

- [ ] CRM Lead detail shows Print button for permitted user
- [ ] Print preview opens for CRM Lead
- [ ] Lead print preview shows company branding area
- [ ] Lead print preview shows Lead Details, Qualification, Notes
- [ ] CRM Opportunity detail shows Print button
- [ ] Opportunity print preview shows Deal Details, Forecast, Notes
- [ ] browser Print button exists
- [ ] no page errors

---

## I. Tests

Add/update tests:

- [ ] print format type helpers
- [ ] print renderer section rendering
- [ ] permission visibility for Print button if practical
- [ ] default CRM print format seed validation if practical

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

---

## K. Acceptance

Phase 6.3 is complete only when:

- [ ] print permission keys exist and owner/admin grants exist
- [ ] print format metadata table exists
- [ ] default CRM Lead and Opportunity print formats exist
- [ ] Print button appears on permitted metadata-driven detail pages
- [ ] Print Preview renders CRM Lead and Opportunity cleanly
- [ ] browser print action is available
- [ ] no unsafe scripts or arbitrary HTML execution
- [ ] strict browser verification is documented
- [ ] tests and command results are documented
- [ ] AI run report exists

After Phase 6.3, recommended next phase:

- Phase 6.3.1: Print Format Builder polish and PDF strategy
