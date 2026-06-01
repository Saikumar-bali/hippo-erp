# Phase 4.2 — GRN UI Foundation

**Status:** Implementation in progress.
**Target:** Browser-verifiable GRN list, draft form, and read-only posted detail.

## Scope

Build a custom GRN UI that interacts with the Phase 4.1 backend RPCs (`src/lib/grn-api.ts`). This is a transaction document UI — not generic_json CRUD.

### In Scope
- GRN list page (Purchasing → GRN) with all requested columns
- GRN draft creation form with header fields + line item grid
- GRN draft editing (re-open a draft, modify, save)
- GRN posting (draft → posted)
- GRN read-only detail view for posted documents
- Status badge component
- Reusable line item grid (editable + read-only modes)
- Backend validation errors surfaced in UI
- Duplicate post guard
- Product Master guardrail verification

### Out of Scope
- Purchase Orders
- Invoices / payments
- Stock transfers, adjustments, cycle counts
- Reservations
- Valuation / FIFO / weighted average
- Workflow engine
- Naming series engine (GRN number is caller-provided)

## Component Architecture

```
GrnListPage          — Main list with filters, actions, view mode routing
├─ GrnDraftFormPage  — Create / edit draft GRN (header + GrnLineGrid)
├─ GrnDetailPage     — Read-only posted GRN display
├─ GrnLineGrid       — Reusable line item table (edit / read-only modes)
└─ GrnStatusBadge    — Colored badge for status / qc_status
```

### Data Flow

All GRN operations go through `src/lib/grn-api.ts` which wraps 5 SECURITY DEFINER RPCs:

| UI Action | RPC | Notes |
|-----------|-----|-------|
| List GRNs | `wh_list_grns` | Filtered by tenant_id, status, date range |
| View GRN | `wh_get_grn` | Returns header + lines |
| Create draft | `wh_create_grn_draft` | Validates permissions, refs, uniqueness |
| Update draft | `wh_update_grn_draft` | Draft-only; replaces all lines |
| Post GRN | `wh_post_grn` | Atomic: validate → batches → movements → inventory |

### Selector Data Sources

| Selector | Source |
|----------|--------|
| Product | `listProducts(tenantId)` from `product-api.ts` |
| UOM | `listUoms(tenantId)` from `product-api.ts` |
| Warehouse Bin | Direct `supabase.schema("wh").from("warehouse_bins").select(...)` |

### Migration 0034

Enhances `wh_list_grns` to include `line_count` per GRN row for the list page.

## Product Master Guardrail

Verify that Products → Product list still renders useful columns (SKU, Name, Category, UOM, Status) via the existing DynamicListPage. This guardrail ensures the metadata-driven Product Master was not broken by Phase 4.1 schema changes (which only dropped legacy `wh.*` scaffolding tables, not the active product tables).

**Result:** Products list continues to render correctly via DynamicListPage with columns defined in its List View metadata.
