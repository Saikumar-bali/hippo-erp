# GPT Review Report: Phase 4.9 Builder Hardening + Generic Document Cleanup

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commit

- `b13f938496c4151bf5230c7390682148758b73dc` — Harden metadata studio generic document flow

## Files Reviewed

- `supabase/migrations/0039_generic_document_rpc_cleanup.sql`
- `docs/ai-runs/2026-06-01_phase-4-9-builder-hardening-generic-document-cleanup.md`
- `src/components/metadata/DynamicRouteRenderer.tsx`
- `src/components/metadata-studio/DocTypeBuilder.tsx`
- `tasks.md`

## Review Result

Phase 4.9 is accepted.

This phase fixed the visible generic document edit error and made the builder path easier to follow. The project is now in a better position to prove the metadata engine with a real non-inventory module.

## What Is Good

### Generic document RPC cleanup

Migration `0039_generic_document_rpc_cleanup.sql` replaces the invalid `row_to_jsonb(record)` dependency in `public.erp_get_document()` with explicit `jsonb_build_object(...)` output. This is the right fix because it avoids relying on a custom helper for PostgreSQL record-to-json conversion.

### Browser verification

The AI run report says the Purchase Invoice demo was re-tested in the browser:

- existing record opened without the banner
- edit persisted
- new generic_json record created
- record edited successfully
- record deactivated successfully
- Check / Repair passed with 12 checks

### Builder flow guidance

The selected DocType can now be carried through builder routes using `metadata_studio_*:<doctype_key>` route keys. `DocTypeBuilder` also shows next-step actions after save.

## Remaining Gaps

### 1. Frontend test suite still has existing failures

`npm run test` still reports 44 passed and 6 failed. The failures are documented as pre-existing, but they should not remain forever. They should be cleaned before calling the platform production-ready.

### 2. Screenshots are still local-only

Screenshots were captured locally, not committed. Acceptable for now, but future major UI milestones should commit screenshots or provide a reproducible artifact path.

### 3. Builder is usable, not yet a full app wizard

The builder screens are much better, but a single guided publish wizard is still a future improvement.

## Decision

Do not start Purchase Orders yet.

Purchase Orders are transactional and will need explicit backend flow, status control, validations, and eventually GRN linkage. Before that, prove the metadata engine can build a complete normal business module without custom code.

Proceed to Phase 5.0: CRM Metadata-First Module.

## Why CRM Next

CRM is a better proof for the metadata engine because most CRM records are normal documents:

- Lead
- Contact
- Account
- Opportunity
- Follow-up Task

These can start with `generic_json` and use builder-generated metadata. This proves that the platform can create a full module like Frappe-style custom apps without writing custom CRUD code.

## Phase 5.0 Direction

Build a CRM workspace using metadata only:

- create CRM module/workspace
- seed generic_json DocTypes
- create fields/list views/form layouts/actions/menu items/access
- browser verify create/edit/deactivate for at least Lead and Opportunity
- document which CRM features remain custom-service territory later
