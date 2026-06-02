# Phase 5.0: CRM Metadata-First Module

## Goal

Prove that Hippo ERP can introduce a full business module through metadata, generic document storage, and the existing builder-first Metadata Studio workflow without adding custom CRM RPCs or transactional ERP logic.

## Scope

This phase adds a CRM module and workspace backed by `generic_json` DocTypes only.

In scope:

- CRM module and workspace metadata
- Five CRM DocTypes stored in `app.erp_documents`
- Default fields, list views, form layouts, actions, permissions, and workspace items
- Owner/admin access grants
- Browser verification for Leads and Opportunities

Out of scope:

- Purchase Orders
- Custom CRM RPCs
- Accounting or inventory transaction logic
- CRM workflow automation, scoring, email sync, or activity timelines

## Migration

Primary migration:

- `supabase/migrations/0040_crm_metadata_first_module.sql`

This migration seeds:

- `app.erp_modules` row for `crm`
- `app.erp_workspaces` row for `crm`
- Generic DocTypes:
  - `crm_lead`
  - `crm_contact`
  - `crm_account`
  - `crm_opportunity`
  - `crm_followup_task`
- Default field metadata for each DocType
- Default list views and search/filter metadata
- Default form layouts with business-friendly sections
- Standard actions:
  - `read`
  - `create`
  - `update`
  - `deactivate`
- Permission catalog rows
- Role grants for `owner` and `admin`
- CRM workspace items for all five DocTypes

## CRM DocTypes

All seeded CRM DocTypes use:

- `schema_name = app`
- `table_name = erp_documents`
- `storage_strategy = generic_json`
- company scoping enabled

### Seeded records

- `crm_lead`
- `crm_contact`
- `crm_account`
- `crm_opportunity`
- `crm_followup_task`

## Browser Result

Verified in browser:

- CRM workspace appears
- Leads open successfully
- Lead create/edit/deactivate works
- Opportunities open successfully
- Opportunity create/edit/deactivate works
- No owner/admin permission error was shown
- Metadata Studio builders can inspect `crm_lead` and `crm_opportunity`

Local-only screenshots were captured under:

- `C:\tmp\phase-5-0-crm`

## Additional Fix

While verifying CRM, a generic renderer issue was found and fixed in:

- `src/components/metadata/DynamicListPage.tsx`

Change:

- reset list `search`, `filterValues`, `page`, and link-label state when switching between DocTypes

This prevents stale Lead filters/search terms from incorrectly hiding Opportunity records after navigation.

## Known Gap

The metadata and builders are seeded correctly, but the `Check / Repair` home-entry flow remained flaky under long Playwright automation runs. The remaining follow-up is one clean manual browser pass for:

- `crm_lead`
- `crm_opportunity`

The checklist metadata itself is present, and the DocTypes/builders/loaders are in place, but this specific browser step was not marked complete automatically.
