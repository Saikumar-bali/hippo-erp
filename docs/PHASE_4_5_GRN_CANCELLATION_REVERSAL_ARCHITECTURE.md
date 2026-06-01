# Phase 4.5 — GRN Cancellation / Reversal Architecture

**Branch:** `phase-2.5-metadata-engine`
**Status:** Architecture / Planning only (no implementation)

---

## 1. Why

A posted GRN adds inventory quantities into the system via `wh.inventory_movements` (type `GRN_RECEIPT`) and upserts `wh.current_inventory`. If a GRN was posted in error (wrong product, wrong quantity, wrong supplier, duplicate receipt), the system must support a safe **cancellation** that reverses the inventory impact while preserving the audit trail.

Key constraints:
- A posted GRN **cannot be edited** (status guard prevents it).
- The original `GRN_RECEIPT` movements must remain **unchanged** in the append-only ledger.
- Cancellation must create **reversal movements** (`REVERSAL` type) that mirror the original with negated quantities.
- **Duplicate cancellation** must be blocked.
- Cancellation must be **atomic** — all lines reverse or none do.
- Cancellation must be **blocked** if stock from this GRN has already been consumed below the reversal quantity (the cancellation would make current inventory negative).

---

## 2. Reversal Rules

| Rule | Detail |
|------|--------|
| Posted GRN cannot be edited directly | Existing `status != 'draft'` guard already enforced. |
| Cancellation creates reversal movements | For each line with `accepted_qty > 0`, insert `movement_type = 'REVERSAL'` with `qty_delta = -(accepted_qty)`. |
| Original movements remain unchanged | The append-only design of `inventory_movements` is respected. No DELETE or UPDATE on existing movements. |
| Current inventory is reduced | Decrement `on_hand_qty` and `available_qty` by the original `accepted_qty` via upsert. |
| Cancellation is atomic | Wrapped in a single RPC with exception handling; partial reversals are impossible. |
| Duplicate cancellation blocked | GRN must have `status = 'posted'`; if already `'cancelled'`, RPC returns error. |
| Cancellation requires reason | `p_reason text` parameter, stored in `cancel_reason` column. |
| Cancellation blocked if stock consumed | Before reversing each line, compare `on_hand_qty` for that (product, batch, bin) against the `accepted_qty`. If `on_hand_qty < accepted_qty`, cancellation is rejected. |
| Batch handling | `inventory_batches.is_active` set to `false` for batches created solely by this GRN. |

### Stock Consumption Guard — Detail

The `wh.current_inventory` row for the (tenant, product, batch, bin) combination must have `on_hand_qty >= accepted_qty` for each line being reversed. This prevents:
- Negative inventory after reversal
- Partial GRN cancellation when stock has already been transferred out, sold, or adjusted

**Design decision**: Block entire GRN cancellation if **any** line fails the stock check. This is simpler and safer than partial cancellation.

---

## 3. Proposed Table Changes

No new tables. Changes are limited to **column additions** on existing tables and one optional audit table.

### 3a. `wh.grns` — Add columns

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `cancelled_by` | `uuid` | nullable, `REFERENCES auth.users(id)` | Who cancelled |
| `cancelled_at` | `timestamptz` | nullable | When cancelled |
| `cancel_reason` | `text` | nullable | Required reason text |

These complement the existing `posted_by` / `posted_at` pattern. No change to the `status` CHECK constraint — `'cancelled'` is already allowed.

### 3b. `wh.inventory_movements` — Add columns

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `is_reversal` | `boolean` | `NOT NULL DEFAULT false` | Flag for reversal rows |
| `reversal_of_movement_id` | `uuid` | nullable, `REFERENCES wh.inventory_movements(id)` | Links reversal to original GRN_RECEIPT movement |

**Alternative considered**: Linking to `grn_lines` via `source_line_id`. The existing `source_type` / `source_id` / `source_line_id` columns already link back to the GRN. Adding `reversal_of_movement_id` gives a direct movement-to-movement link, which is useful for UI (showing "Reversal of movement X") and for analytics.

**Why `is_reversal` and not rely solely on `movement_type`?** The `movement_type = 'REVERSAL'` CHECK already exists. The `is_reversal` boolean makes querying simpler (`WHERE is_reversal = true`) and avoids parsing the CHECK constraint. Both are used together for clarity.

### 3c. `wh.inventory_batches` — No structural change

The `is_active` boolean already exists. Cancellation will set `is_active = false` for batches created exclusively by the cancelled GRN.

**Design decision**: Only deactivate batches whose `created_from_id = grn_id` AND `created_from = 'GRN'`. If a batch already existed before this GRN (batch was reused), leave `is_active` unchanged.

### 3d. `wh.grn_status_events` — Optional audit table (deferred)

A dedicated audit trail for GRN status transitions could be added in a future phase:

```sql
create table if not exists wh.grn_status_events (
  id uuid primary key default gen_random_uuid(),
  grn_id uuid not null references wh.grns(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  changed_by uuid,
  reason text,
  created_at timestamptz not null default now()
);
```

**Deferred** because the existing `posted_by` / `posted_at` / `cancelled_by` / `cancelled_at` columns already provide the essential audit trail for the `draft → posted → cancelled` lifecycle. This table would add value for multi-step workflows (e.g., `draft → qc_hold → posted → cancelled`) which are not planned yet.

---

## 4. Proposed RPC Design

### `wh_cancel_grn(p_grn_id uuid, p_reason text)`

**Returns:** `jsonb` — standard `{ok: true, data: {grn_id, reversals_created: N}}` or `{ok: false, error: '...'}`

**Permission:** Check `cancel_grn` permission key (new).

**Algorithm:**

```
1. SELECT ... FROM wh.grns WHERE id = p_grn_id FOR UPDATE
   → Not found? Return error.
   → Status != 'posted'? Return error ("Only posted GRNs can be cancelled").
   → Already cancelled (posted_by IS NULL, cancelled_by IS NOT NULL)? Return error.

2. If NOT wh.current_user_has_grn_permission(tenant_id, 'cancel_grn'):
   → Return permission error.

3. IF p_reason IS NULL OR trim(p_reason) = '':
   → Return error ("Cancellation reason is required").

4. Loop over each line with accepted_qty > 0:
   a. Look up current_inventory for (tenant_id, product_id, batch_id, bin_id).
   b. If on_hand_qty < accepted_qty → RAISE "Stock consumed: cannot reverse line N".

5. (Second pass) Loop over each line with accepted_qty > 0:
   a. Insert inventory_movements row:
        movement_type = 'REVERSAL'
        is_reversal = true
        reversal_of_movement_id = original movement id (found via source_line_id)
        qty_delta = -(accepted_qty)
        source_type = 'GRN'
        source_id = grn_id
        source_line_id = line.id
        product_id, batch_id, bin_id from line
        created_by = auth.uid()
   b. Upsert current_inventory:
        on_hand_qty = on_hand_qty - accepted_qty
        available_qty = available_qty - accepted_qty
   c. Track reversals_created count.

6. For each batch created by this GRN (created_from = 'GRN' AND created_from_id = grn_id):
   → Set is_active = false.

7. Update wh.grns:
     status = 'cancelled'
     cancel_reason = p_reason
     cancelled_by = auth.uid()
     cancelled_at = now()
     updated_by = auth.uid()
     updated_at = now()

8. Return { ok: true, data: { grn_id, reversals_created } }
```

**Exception handling:** Wrap in `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END;` to return a structured error message on any failure.

### Why two passes?

- **Pass 1 (validation):** Check all lines before modifying any data. If one line fails the stock check, the entire cancellation is rejected with a clear message.
- **Pass 2 (execution):** Perform the actual inserts/updates. Since stock checks passed in pass 1, pass 2 should succeed (barring concurrency issues, handled by the `FOR UPDATE` row lock).

---

## 5. Permission Design

### New permission key: `cancel_grn`

| Column | Value |
|--------|-------|
| `permission_key` | `cancel_grn` |
| `module` | `grn` |
| `label` | Cancel GRN |
| `description` | Cancel a posted GRN document |
| `sort_order` | 26 |

### Default grants (same pattern as `post_grn` and `delete_grn`)

| Role | Granted |
|------|---------|
| `owner` | Yes |
| `admin` | Yes |
| `warehouse_manager` | Yes |

`stock_operator`, `viewer`, `auditor` — **not granted** by default. Cancellation is a sensitive operation that should require manager-level authority.

### Reusing `cancel_document`?

The existing `cancel_document` permission key (from migration 0007) is a generic key that could be reused. However, a specific `cancel_grn` key is preferred for:
- Fine-grained audit: who can cancel GRNs vs. other document types
- Clear permission documentation in the UI
- Consistency with existing specific keys (`post_grn`, `delete_grn`, `qc_grn`)

---

## 6. Simulation Plan

**File:** `tests/simulations/grn_cancellation_reversal_flow.sql`

### Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Cancel a posted GRN | All reversals created, GRN status = `cancelled`, current inventory decremented |
| 2 | Cancel an already cancelled GRN | Error: "GRN is already cancelled" |
| 3 | Cancel a draft GRN | Error: "Only posted GRNs can be cancelled" |
| 4 | Cancel without reason | Error: "Cancellation reason is required" |
| 5 | Cancel with stock consumed below reversal qty | Error: "Stock consumed: cannot reverse line N" |
| 6 | Verify original movements unchanged | `SELECT * FROM wh.inventory_movements WHERE source_id = grn_id AND movement_type = 'GRN_RECEIPT'` still present |
| 7 | Verify reversal movements created | `SELECT * FROM wh.inventory_movements WHERE source_id = grn_id AND movement_type = 'REVERSAL'` has correct negated qty |
| 8 | Verify `reversal_of_movement_id` correctly links | Reversal row points to original GRN_RECEIPT movement |
| 9 | Verify current inventory correctly decremented | `on_hand_qty` matches original minus reversal |
| 10 | Verify batch deactivation | `inventory_batches.is_active = false` for GRN-created batches |
| 11 | Verify permission denied for unauthorized role | Call without `cancel_grn` permission → error |

### SQL Structure

```sql
-- Test 1: Setup tenant, product, UOM, bin, create draft, post, cancel
-- ...
-- Test N: Teardown
```

---

## 7. UI Plan

### 7a. Cancel GRN Button

**Location:** `GrnDetailPage.tsx` — in the action bar, shown only when `status === 'posted'`.

**Conditions:**
- GRN must be `posted`
- User must have `cancel_grn` permission (checked via a prop or hook)

### 7b. Cancel Reason Dialog

A small modal/dialog with:
- Textarea for reason (required)
- Confirm / Cancel buttons
- "Are you sure?" confirmation with warning about inventory impact

**Component:** `CancelGrnDialog.tsx` (new)

### 7c. Status Badge Update

**File:** `GrnStatusBadge.tsx`

Add a `cancelled` status case with appropriate styling (e.g., red/gray badge).

### 7d. Reversal Rows in Movement Ledger

No changes needed to `InventoryMovementsPage.tsx` — the `wh_list_inventory_movements` RPC already returns all movements including `REVERSAL` type. The UI already renders `movement_type` in the table. A filter option for `movement_type = 'REVERSAL'` could be added later.

### 7e. Cancelled GRN Read-Only

The `GrnDraftFormPage.tsx` already redirects posted GRNs to view mode. The same guard should apply to cancelled GRNs. No additional changes needed — the existing `status !== 'draft'` check in the detail page's edit button already covers this.

### 7f. UI Component Summary

| Component | Change |
|-----------|--------|
| `GrnDetailPage.tsx` | Add cancel button (conditionally rendered) |
| `CancelGrnDialog.tsx` | New — reason dialog with confirmation |
| `GrnStatusBadge.tsx` | Add `cancelled` case |
| `grn-api.ts` | Add `cancelGrn(grnId, reason)` wrapper |
| `inventory-api.ts` | No change (movement list RPC already supports REVERSAL) |

---

## 8. Risks and Edge Cases

| Risk | Mitigation |
|------|------------|
| **Concurrent cancellation**: Two users try to cancel the same GRN simultaneously | `SELECT ... FOR UPDATE` row lock on `wh.grns`. Second caller will wait and then see `status = 'cancelled'`. |
| **Stock consumed between pass 1 and pass 2** | The `FOR UPDATE` lock prevents concurrent modifications to the GRN row. However, `current_inventory` rows for each line could be modified by another transaction (e.g., a concurrent GRN posting, stock transfer). **Mitigation**: Consider locking `current_inventory` rows in pass 1 with `FOR UPDATE`. |
| **Batch shared across multiple GRNs** | Only deactivate `inventory_batches` where `created_from_id = grn_id AND created_from = 'GRN'`. Shared batches (created by a different GRN) are not touched. |
| **Partial stock consumption** | If 5 units were received and 3 were transferred out, remaining stock is 2. Cancellation with `accepted_qty = 5` would attempt to reverse 5 units but only 2 are available. The stock consumption guard rejects this. **Decision**: Block full cancellation when any line's stock is insufficient. Partial reversal could be a future enhancement. |
| **Large GRN (many lines)** | The two-pass design means two loops. Performance impact is negligible for typical GRN sizes (1-50 lines). |
| **Cancellation of a GRN that created a batch with expiry** | The `is_active = false` on the batch prevents it from appearing in batch pickers, but the batch record and expiry data remain for audit. |
| **Service role vs. authenticated user** | The `current_user_has_grn_permission` helper already returns `true` for `auth.uid() IS NULL` (service role). Cancellation via Management API is permitted by design. |

---

## 9. Proposed Migration File

`supabase/migrations/0038_grn_cancellation_reversal.sql`

Structure:
1. **Phase A — Schema changes**: `ALTER TABLE wh.grns ADD COLUMN ...`, `ALTER TABLE wh.inventory_movements ADD COLUMN ...`
2. **Phase B — Permission**: Insert `cancel_grn` key into `app.permission_keys`, grant to roles
3. **Phase C — RPC**: `wh_cancel_grn(p_grn_id uuid, p_reason text)`
4. **Phase D — Workspace**: Optionally add a workspace action for cancellation

---

## 10. Next Implementation Recommendation

Proceed to **Phase 4.6** which should implement the full cancellation feature:

1. Create and apply migration `0038_grn_cancellation_reversal.sql`
2. Build `CancelGrnDialog.tsx` and wire it into `GrnDetailPage.tsx`
3. Update `GrnStatusBadge.tsx` for `cancelled` status
4. Add `cancelGrn()` to `src/lib/grn-api.ts`
5. Create simulation test `tests/simulations/grn_cancellation_reversal_flow.sql`
6. Run and document all verification (typecheck, lint, test, Supabase Cloud)
7. Browser verify the full cancellation flow
8. Create AI run report

Do **not** start Purchase Orders, stock transfers, adjustments, or workflow until Phase 4.6 is complete.
