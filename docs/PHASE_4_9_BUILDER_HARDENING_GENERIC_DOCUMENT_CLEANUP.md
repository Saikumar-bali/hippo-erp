# Phase 4.9: Builder Hardening + Generic Document Cleanup

## Goal

Finish the Metadata Studio builder milestone before starting Purchase Orders or CRM by:

- removing the visible generic document backend banner
- tightening the builder-to-publish flow
- improving first-time builder guidance
- re-verifying generic_json document behavior in the browser

## Scope

This phase is limited to:

- generic_json document RPC cleanup
- Metadata Studio builder UX guidance
- Check / Repair flow access
- Purchase Invoice demo verification

This phase does **not** include:

- Purchase Orders
- CRM
- new ERP transaction logic

## Problem

Phase 4.8 still had one visible backend issue during Purchase Invoice edit:

```text
function row_to_jsonb(record) does not exist
```

The update persisted, but the visible banner meant the generic document edit flow was not production-clean.

## Root Cause

The deployed Supabase `public.erp_get_document()` function still returned:

```sql
row_to_jsonb(v_doc)
```

That relied on a custom helper with a `record` argument. In the live project, this surfaced as a runtime function-resolution error during generic_json edit loads.

## Fix

Added:

- `supabase/migrations/0039_generic_document_rpc_cleanup.sql`

The migration:

- redefines `public.erp_get_document()`
- replaces the helper call with an explicit `jsonb_build_object(...)`
- drops `public.row_to_jsonb(record)` after the RPC no longer depends on it

## Builder Flow Improvements

Phase 4.9 also improves builder usability:

- Metadata Studio home now has a direct `Open Check / Repair` action
- DocType Builder now shows next-step actions after save:
  - Fields
  - List View
  - Form Layout
  - Menu
  - Access
  - Check / Repair
- Field, List View, and Form Layout builders now carry the selected DocType forward
- Access Builder now includes a direct `Open Check / Repair DocType` action
- empty states and guidance were improved across the builder path

## Verification Expectations

Phase 4.9 is complete when:

- Purchase Invoice edit no longer shows the `row_to_jsonb(record)` banner
- generic_json create/edit/deactivate still works
- Check / Repair for `purchase_invoice` completes successfully
- builder flow guidance is clearer from save to verification
