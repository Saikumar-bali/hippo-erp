# Phase 3 Tasks: Warehouse Hierarchy

Active branch: `phase-2.5-metadata-engine`

Goal: Build the Warehouse hierarchy master data module using the metadata-driven ERP framework created in Phases 2.5–2.10.

Warehouse hierarchy is master data only in this phase. Do not implement GRN, stock ledger posting, transfers, adjustments, reservations, valuation, or reports yet.

## Why This Phase Starts Now

Phase 2.10 proved the framework foundation:

- Workspace/sidebar metadata works.
- DynamicListPage can render metadata-driven DocTypes.
- Custom DocType Wizard can create generic JSON DocTypes.
- Generic JSON document CRUD works for custom master data.
- Product Master physical RPC DocTypes still work.

Warehouse can now be built on the metadata foundation.

---

# A. Architecture And Docs

Create/update:

- [ ] `docs/PHASE_3_WAREHOUSE_HIERARCHY.md`
- [ ] `docs/METADATA_ENGINE.md`
- [ ] `progress.md`
- [x] GPT review approval report: `docs/ai-runs/2026-05-30_gpt-review-phase-2-10-hardening.md`

Document:

- [ ] Warehouse hierarchy structure
- [ ] Which entities are master data
- [ ] Why stock-changing actions are out of scope
- [ ] Metadata-driven vs explicit transactional logic boundary
- [ ] Supabase Cloud verification steps

---

# B. Warehouse Hierarchy Model

Implement master data hierarchy:

```text
Warehouse
  Zone
    Aisle
      Rack
        Shelf
          Bin
```

DocTypes:

- [ ] `warehouse`
- [ ] `warehouse_zone`
- [ ] `warehouse_aisle`
- [ ] `warehouse_rack`
- [ ] `warehouse_shelf`
- [ ] `warehouse_bin`

Recommended storage strategy for Phase 3:

- [ ] Use `generic_json` first unless there is a strong reason for physical tables.
- [ ] Do not create stock movement/ledger tables in this phase.
- [ ] Do not put quantity/valuation logic inside warehouse master records.

---

# C. Metadata Seed / Bundle Creation

Create migration or seed file:

- [ ] `supabase/migrations/0028_warehouse_hierarchy_metadata.sql`

Seed:

- [ ] Warehouse workspace or use existing inactive Warehouse workspace and activate it.
- [ ] Workspace items for all six Warehouse hierarchy DocTypes.
- [ ] DocTypes with `storage_strategy = generic_json`.
- [ ] DocFields for all six DocTypes.
- [ ] List Views.
- [ ] Form Layouts.
- [ ] DocType Actions.
- [ ] Permission catalog keys.
- [ ] Owner/admin grants.

Preferred permission keys:

```text
view_warehouses
create_warehouse
update_warehouse
delete_warehouse
view_warehouse_zones
create_warehouse_zone
update_warehouse_zone
delete_warehouse_zone
view_warehouse_bins
create_warehouse_bin
update_warehouse_bin
delete_warehouse_bin
```

Use consistent pattern for aisle/rack/shelf too.

---

# D. Required Fields

## warehouse

- [ ] `warehouse_code` Data required list
- [ ] `warehouse_name` Data required list
- [ ] `warehouse_type` Select list/filter
- [ ] `address` Text
- [ ] `is_active` Check list/filter

## warehouse_zone

- [ ] `zone_code` Data required list
- [ ] `zone_name` Data required list
- [ ] `warehouse_id` Link to `warehouse` required list/filter
- [ ] `zone_type` Select list/filter
- [ ] `is_active` Check list/filter

## warehouse_aisle

- [ ] `aisle_code` Data required list
- [ ] `aisle_name` Data list
- [ ] `warehouse_id` Link to `warehouse` required filter
- [ ] `zone_id` Link to `warehouse_zone` required list/filter
- [ ] `is_active` Check list/filter

## warehouse_rack

- [ ] `rack_code` Data required list
- [ ] `rack_name` Data list
- [ ] `warehouse_id` Link to `warehouse` required filter
- [ ] `zone_id` Link to `warehouse_zone` required filter
- [ ] `aisle_id` Link to `warehouse_aisle` required list/filter
- [ ] `is_active` Check list/filter

## warehouse_shelf

- [ ] `shelf_code` Data required list
- [ ] `shelf_name` Data list
- [ ] `warehouse_id` Link to `warehouse` required filter
- [ ] `zone_id` Link to `warehouse_zone` required filter
- [ ] `aisle_id` Link to `warehouse_aisle` required filter
- [ ] `rack_id` Link to `warehouse_rack` required list/filter
- [ ] `is_active` Check list/filter

## warehouse_bin

- [ ] `bin_code` Data required list
- [ ] `bin_name` Data list
- [ ] `warehouse_id` Link to `warehouse` required filter
- [ ] `zone_id` Link to `warehouse_zone` required filter
- [ ] `aisle_id` Link to `warehouse_aisle` required filter
- [ ] `rack_id` Link to `warehouse_rack` required filter
- [ ] `shelf_id` Link to `warehouse_shelf` required list/filter
- [ ] `bin_type` Select list/filter
- [ ] `capacity` Float
- [ ] `is_active` Check list/filter

---

# E. Link Field UI Requirements

Because hierarchy uses many Link fields, improve or verify Link behavior:

- [ ] Link fields should show readable labels, not raw UUIDs.
- [ ] Support `display_fields` and `display_template`.
- [ ] Example: `{warehouse_code} - {warehouse_name}`.
- [ ] For child levels, show parent context clearly.
- [ ] If dependent filtering is not implemented yet, document limitation.

Recommended metadata options:

```json
{
  "link_to": "warehouse",
  "display_fields": ["warehouse_code", "warehouse_name"],
  "display_template": "{warehouse_code} - {warehouse_name}"
}
```

---

# F. Frontend Expectations

The Warehouse module should appear in the sidebar as:

```text
Warehouse
  Warehouses
  Zones
  Aisles
  Racks
  Shelves
  Bins
```

Each item should open a DynamicListPage.

Required UI checks:

- [ ] Warehouse workspace appears only for permitted users.
- [ ] Six child items appear.
- [ ] Each list opens.
- [ ] Each list has compact table layout.
- [ ] Create form works for each level.
- [ ] Link dropdowns load parent records.
- [ ] Records list with readable parent labels.
- [ ] Edit works.
- [ ] Deactivate works.

---

# G. Simulation Test

Add:

- [ ] `tests/simulations/warehouse_hierarchy_flow.sql`

Simulation must verify:

- [ ] Warehouse workspace active.
- [ ] Six Warehouse DocTypes exist with `generic_json`.
- [ ] All required DocFields exist.
- [ ] List Views exist.
- [ ] Form Layouts exist.
- [ ] DocType Actions exist.
- [ ] Permission keys exist.
- [ ] Owner/admin grants exist.
- [ ] Workspace Items exist.
- [ ] Create sample Warehouse document through `erp_create_document`.
- [ ] Create sample Zone linked to Warehouse.
- [ ] Create sample Aisle linked to Zone.
- [ ] Create sample Rack linked to Aisle.
- [ ] Create sample Shelf linked to Rack.
- [ ] Create sample Bin linked to Shelf.
- [ ] List all records.
- [ ] Update one record.
- [ ] Deactivate one record.
- [ ] Rollback or cleanup at end.

Update:

- [ ] `scripts/run-simulation.cjs`

---

# H. Real Browser UI Verification

CLI-AI must verify with browser automation or document why unavailable.

Manual flow:

- [ ] Open Warehouse workspace.
- [ ] Create Warehouse: `MAIN-WH`, `Main Warehouse`.
- [ ] Create Zone linked to Warehouse: `RAW-ZONE`, `Raw Material Zone`.
- [ ] Create Aisle linked to Zone.
- [ ] Create Rack linked to Aisle.
- [ ] Create Shelf linked to Rack.
- [ ] Create Bin linked to Shelf.
- [ ] Confirm each list shows readable parent labels.
- [ ] Edit Bin capacity.
- [ ] Deactivate Bin.

Screenshots should be committed if possible under:

```text
docs/ai-runs/screenshots/phase-3-warehouse/
```

If screenshots are captured locally but not committed, the report must say that explicitly.

---

# I. UI Review Requirements

Review and report:

- [ ] Warehouse hierarchy sidebar clarity
- [ ] Link dropdown usability
- [ ] Parent-child context readability
- [ ] Table density
- [ ] Empty states
- [ ] Form labels/helper text
- [ ] Error states
- [ ] Any raw UUID leakage

---

# J. Verification Commands

Run and document exact output:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Supabase Cloud verification required:

- [ ] Apply migration/seed to Supabase Cloud
- [ ] Run `warehouse_hierarchy_flow.sql` on Supabase Cloud
- [ ] Record PASS/FAIL in `progress.md`
- [ ] Add detailed report under `docs/ai-runs/`

---

# K. AI Run Report

Create:

- [ ] `docs/ai-runs/2026-05-30_phase-3-warehouse-hierarchy.md`

Must include:

- [ ] Goal
- [ ] Branch/final commit
- [ ] Files inspected
- [ ] Files created
- [ ] Files modified
- [ ] Supabase Cloud changes
- [ ] Simulation results
- [ ] Real UI verification
- [ ] Screenshot paths or note that screenshots were local-only
- [ ] UI review
- [ ] Command results
- [ ] Known gaps
- [ ] Next task

---

# L. Out Of Scope

Do not implement in this phase:

- [ ] GRN
- [ ] Stock Ledger
- [ ] Stock quantity calculations
- [ ] Inventory valuation
- [ ] Stock transfers
- [ ] Stock adjustments
- [ ] Reservations
- [ ] Reorder alerts
- [ ] Workflow engine
- [ ] Naming series engine

---

# M. Acceptance Criteria

Phase 3 is complete only when:

- [ ] Warehouse workspace is active and visible.
- [ ] All six hierarchy DocTypes exist and open with DynamicListPage.
- [ ] Records can be created for Warehouse → Zone → Aisle → Rack → Shelf → Bin.
- [ ] Parent Link fields show readable labels.
- [ ] Edit/deactivate works.
- [ ] Supabase Cloud simulation passes.
- [ ] Real browser UI verification is documented.
- [ ] Build/typecheck/lint/test results are documented.
- [ ] Detailed AI run report exists under `docs/ai-runs/`.

Only after Phase 3 should GRN or Stock Ledger planning begin.
