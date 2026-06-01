# Phase 3: Warehouse Hierarchy (Metadata-Driven)

## Goal

Build a metadata-driven Warehouse hierarchy as master data only (no stock logic):

```
Warehouse
  Zone
    Aisle
      Rack
        Shelf
          Bin
```

Six generic_json DocTypes with parent-child Link fields connecting each level.

## Architecture

| DocType | Module | Storage | Parent Link |
|---------|--------|---------|-------------|
| `warehouse` | warehouse | generic_json | — (root) |
| `warehouse_zone` | warehouse | generic_json | warehouse |
| `warehouse_aisle` | warehouse | generic_json | warehouse_zone |
| `warehouse_rack` | warehouse | generic_json | warehouse_aisle |
| `warehouse_shelf` | warehouse | generic_json | warehouse_rack |
| `warehouse_bin` | warehouse | generic_json | warehouse_shelf |

## Fields per DocType

### warehouse
- warehouse_code (Data, required, list, filter)
- warehouse_name (Data, required, list)
- address (Text)
- is_active (Check, list)

### warehouse_zone
- zone_code (Data, required, list, filter)
- zone_name (Data, required, list)
- warehouse (Link → warehouse, display_field=warehouse_name, required)
- is_active (Check, list)

### warehouse_aisle
- aisle_code (Data, required, list, filter)
- aisle_name (Data, required, list)
- warehouse_zone (Link → warehouse_zone, display_field=zone_name, required)
- is_active (Check, list)

### warehouse_rack
- rack_code (Data, required, list, filter)
- rack_name (Data, required, list)
- warehouse_aisle (Link → warehouse_aisle, display_field=aisle_name, required)
- is_active (Check, list)

### warehouse_shelf
- shelf_code (Data, required, list, filter)
- shelf_name (Data, required, list)
- warehouse_rack (Link → warehouse_rack, display_field=rack_name, required)
- is_active (Check, list)

### warehouse_bin
- bin_code (Data, required, list, filter)
- bin_name (Data, required, list)
- warehouse_shelf (Link → warehouse_shelf, display_field=shelf_name, required)
- capacity (Float)
- is_active (Check, list)

## Permissions

Each DocType gets 4 permission keys (view, create, update, delete) prefixed with the doctype key. Granted to owner/admin roles.

## Workspace

Items added under the existing `warehouse` workspace (already present from migration 0021).

## Simulation

`tests/simulations/warehouse_hierarchy_flow.sql` — creates all 6 doctypes, inserts one full hierarchy chain, creates/updates/deactivates a bin, then rolls back.

## Exclusions

- No GRN
- No Stock Ledger
- No stock quantity calculations
- No stock transfers/adjustments/reservations/valuation
- No physical table creation from the UI
- No RLS weakening
