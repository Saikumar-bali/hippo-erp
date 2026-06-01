# Phase 4.1 Tasks: GRN Backend Foundation

Active branch: `phase-2.5-metadata-engine`

Goal: Implement the backend foundation for GRN and inventory receipt using physical `wh.*` tables, RLS, explicit RPC functions, and Supabase Cloud simulations. Do **not** build the full GRN UI yet.

## Why This Phase Exists

Phase 4 planning is complete and accepted. The architecture correctly separates:

- master data → metadata/generic JSON path
- inventory transactions → physical tables + explicit database functions

Now implement the backend foundation first. The UI should come only after database behavior is proven by simulation.

---

# A. Planning And Review Docs

- [x] GPT review report: `docs/ai-runs/2026-06-01_gpt-review-phase-4-grn-architecture.md`
- [ ] Update `progress.md` after implementation
- [ ] Update `docs/METADATA_ENGINE.md` if any implementation decision changes
- [ ] Create AI run report: `docs/ai-runs/2026-06-01_phase-4-1-grn-backend-foundation.md`

---

# B. Inspect Existing Schema Before Coding

Before writing migrations, inspect existing migrations/source and confirm exact table names for:

- [ ] company/tenant table
- [ ] auth/user table references
- [ ] company membership table
- [ ] permission catalog table
- [ ] role permission table
- [ ] Product Master storage path
- [ ] Warehouse hierarchy storage path

Important caution:

- Do not blindly reference `app.companies(id)` or `core.users(id)` unless those tables actually exist.
- Do not blindly reference `app.erp_documents(id)` for product IDs if current Product Master is physical RPC-backed.

Document the confirmed references in the AI run report.

---

# C. Migration: GRN And Inventory Tables

Create migration:

- [ ] `supabase/migrations/0030_grn_inventory_tables.sql`

Create physical transaction tables, adjusted to actual schema names:

- [ ] `wh.grns`
- [ ] `wh.grn_lines`
- [ ] `wh.inventory_batches`
- [ ] `wh.inventory_movements`
- [ ] `wh.current_inventory`

Required behavior:

- [ ] GRN header has `draft`, `posted`, `cancelled` status.
- [ ] GRN lines validate quantities.
- [ ] Inventory movement ledger is append-oriented.
- [ ] Current inventory is company/product/batch/bin scoped.
- [ ] Posted GRNs cannot be modified casually.
- [ ] Timestamps and audit fields exist where appropriate.

Nullable batch caution:

- [ ] Do not create a unique key that allows duplicate `NULL batch_id` rows.
- [ ] Use a safe strategy: normalized generated key, partial unique indexes, expression index with `coalesce`, or always create a batch row.
- [ ] Document the chosen strategy.

---

# D. Migration: Permissions And Workspace Metadata

Create migration:

- [ ] `supabase/migrations/0031_grn_permissions_workspace.sql`

Seed permissions:

- [ ] `view_grn`
- [ ] `create_grn`
- [ ] `update_grn`
- [ ] `post_grn`
- [ ] `delete_grn`
- [ ] `cancel_grn` optional/future
- [ ] `view_inventory_movements`
- [ ] `view_current_inventory`

Seed workspace/menu metadata:

- [ ] Purchasing workspace exists/active
- [ ] GRN item visible under Purchasing
- [ ] Inventory movements/current inventory read-only pages planned or seeded as inactive if UI not ready

Grant permissions to owner/admin roles according to existing role model.

---

# E. Migration: RLS Policies

Create migration:

- [ ] `supabase/migrations/0032_grn_inventory_rls.sql`

Rules:

- [ ] Authenticated company members can read their company GRNs.
- [ ] Authenticated company members can read their company inventory movements.
- [ ] Authenticated company members can read current inventory.
- [ ] Frontend users cannot directly insert/update/delete movement rows.
- [ ] Frontend users cannot directly mutate current inventory.
- [ ] Writes go through explicit RPCs only.
- [ ] RLS enabled on all new `wh.*` tables.

---

# F. Migration: RPC Functions

Create migration:

- [ ] `supabase/migrations/0033_grn_inventory_rpcs.sql`

Implement explicit SECURITY DEFINER functions:

- [ ] `wh_create_grn_draft(...)`
- [ ] `wh_update_grn_draft(...)`
- [ ] `wh_get_grn(...)`
- [ ] `wh_list_grns(...)`
- [ ] `wh_post_grn(...)`

Function requirements:

- [ ] Validate company context.
- [ ] Validate current user membership/permissions.
- [ ] Validate product/UOM/warehouse/bin references.
- [ ] Validate quantities.
- [ ] Validate batch/expiry rules from Product metadata where available.
- [ ] Create or reuse batch record.
- [ ] Insert inventory movement rows.
- [ ] Upsert current inventory.
- [ ] Mark GRN as posted.
- [ ] Ensure posting is atomic.
- [ ] Block duplicate posting.
- [ ] Block update of posted GRN.

---

# G. Minimal Frontend API Wrapper

Add only if needed for verification or future UI:

- [ ] `src/lib/grn-api.ts`

Include functions:

- [ ] `listGrns(companyId, filters)`
- [ ] `getGrn(companyId, grnId)`
- [ ] `createGrnDraft(companyId, payload)`
- [ ] `updateGrnDraft(companyId, grnId, payload)`
- [ ] `postGrn(companyId, grnId)`

Do not build polished GRN UI in this phase.

---

# H. Simulation Test

Create:

- [ ] `tests/simulations/grn_inventory_receipt_flow.sql`

Update:

- [ ] `scripts/run-simulation.cjs`

Simulation must verify on Supabase Cloud:

- [ ] setup test product/UOM/warehouse/bin records as needed
- [ ] create draft GRN
- [ ] add/update line
- [ ] post GRN
- [ ] GRN status becomes posted
- [ ] batch created or reused
- [ ] movement row created with accepted quantity
- [ ] current inventory increased
- [ ] rejected quantity does not increase inventory
- [ ] duplicate posting blocked
- [ ] updating posted GRN blocked
- [ ] direct movement mutation blocked for normal frontend role if practical
- [ ] cleanup or rollback at end

---

# I. Verification Commands

Run and document exact output:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Supabase Cloud:

- [ ] Apply migrations 0030–0033
- [ ] Run `tests/simulations/grn_inventory_receipt_flow.sql`
- [ ] Record PASS/FAIL in progress and AI run report

---

# J. AI Run Report

Create:

- [ ] `docs/ai-runs/2026-06-01_phase-4-1-grn-backend-foundation.md`

Must include:

- [ ] files inspected
- [ ] confirmed schema references
- [ ] migrations created
- [ ] RPC functions created
- [ ] RLS decisions
- [ ] nullable batch/current inventory unique strategy
- [ ] simulation result
- [ ] command results
- [ ] known gaps
- [ ] next recommended task

---

# K. Out Of Scope

Do not implement in this phase:

- [ ] full GRN React UI
- [ ] Purchase Orders
- [ ] supplier invoices/payments
- [ ] transfers
- [ ] adjustments
- [ ] cycle counts
- [ ] reservations
- [ ] valuation/FIFO/weighted average
- [ ] full workflow engine
- [ ] naming series engine beyond minimal GRN number generation if needed

---

# L. Acceptance Criteria

Phase 4.1 is complete only when:

- [ ] physical GRN/inventory tables exist on Supabase Cloud
- [ ] RLS is enabled and writes are controlled
- [ ] explicit RPCs exist and pass simulation
- [ ] posting creates movement and current inventory updates atomically
- [ ] duplicate posting is blocked
- [ ] posted GRN update is blocked
- [ ] build/typecheck/lint/test results are documented
- [ ] AI run report exists

After Phase 4.1 passes, proceed to Phase 4.2: GRN UI.
