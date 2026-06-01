# GPT Review Report: Phase 4 GRN + Inventory Receipt Architecture

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commit

- `30372c5` — Phase 4 GRN/inventory receipt architecture planning

## Files Reviewed

- `docs/PHASE_4_GRN_INVENTORY_RECEIPT_ARCHITECTURE.md`
- `docs/ai-runs/2026-06-01_phase-4-grn-inventory-receipt-architecture.md`
- `docs/METADATA_ENGINE.md`
- `progress.md`
- `tasks.md`

## Review Result

Phase 4 planning is accepted.

The architecture makes the correct distinction between master data and inventory transactions:

- Product Master and Warehouse hierarchy can use metadata-driven `generic_json` storage.
- GRN, inventory batches, movement ledger, and current inventory must use explicit physical `wh.*` tables and controlled database functions.

This is the right boundary. Do not implement GRN as generic JSON CRUD.

## What Is Good

The Phase 4 architecture doc defines:

- five physical transaction tables
- five explicit RPC/service functions
- quantity validation rules
- batch and expiry handling rules
- bin allocation requirement
- immutable movement ledger direction
- current inventory snapshot strategy
- RLS/security direction
- UI component strategy
- simulation plan
- browser verification plan

The AI report also triaged the previous test state and reduced the known failures from 8 to 6, all classified as pre-existing.

## Cautions Before Implementation

### 1. Verify real schema names before writing migrations

The architecture doc references `app.companies(id)` and `core.users(id)`. Before writing migration SQL, CLI-AI must inspect the existing migrations and actual Supabase schema. Earlier code has used tenant/company terminology in different places. Do not assume table names.

CLI-AI must confirm the correct references for:

- company/tenant table
- user/auth table
- membership table
- permission catalog table
- role permission table

### 2. Product and warehouse references need a stable source

The proposed GRN lines reference `app.erp_documents(id)` for products and warehouse hierarchy. That is valid for generic_json DocTypes, but Product Master may still use physical RPC-backed tables. CLI-AI must inspect the current Product Master storage before choosing FK strategy.

If Product Master is still physical, then product links may need to reference the physical product table or a stable view/adapter, not blindly `app.erp_documents`.

### 3. Current inventory unique key with nullable batch_id

A unique constraint containing nullable `batch_id` can allow duplicate rows when `batch_id` is null in PostgreSQL. CLI-AI must design this carefully, for example using:

- generated normalized key
- partial unique indexes
- `coalesce(batch_id, zero_uuid)` expression index
- or require a batch row even for non-batch products

Do not leave duplicate-current-inventory risk.

### 4. RPC transaction safety must be proven by simulation

The next phase must implement SQL simulations that prove:

- duplicate posting is blocked
- partial failure rolls back everything
- rejected quantity does not increase inventory
- posted GRN cannot be edited through update RPC
- movement rows are not directly mutable by normal users

## Decision

Proceed to Phase 4.1: GRN Backend Foundation.

Do not build the full UI first. First build tables, RLS, RPCs, permissions, and simulation.

## Next Phase Direction

Phase 4.1 should implement:

1. migration for physical GRN/inventory tables
2. migration for permissions/workspace metadata
3. SECURITY DEFINER RPCs for list/get/create/update/post
4. RLS policies
5. simulation `grn_inventory_receipt_flow.sql`
6. minimal frontend API wrapper only if needed for testing
7. AI run report with Supabase Cloud verification

Full polished GRN UI should be Phase 4.2 after backend simulation passes.
