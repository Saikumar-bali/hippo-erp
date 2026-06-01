# Phase 4.4 Tasks: GRN + Inventory Production Hardening

Active branch: `phase-2.5-metadata-engine`

Goal: Clean up the GRN/inventory read-only layer before adding new transaction modules. This phase fixes documentation gaps, SQL edge cases, workspace visibility, and legacy inventory API risk.

## Why This Phase Exists

Phase 4.3 added useful GRN hardening and inventory read-only screens, but review found production-risk gaps:

- Required AI run report is missing or not named correctly.
- `progress.md` does not clearly summarize Phase 4.2 and Phase 4.3.
- Inventory list RPCs may return `null` instead of `[]` when no rows exist.
- Inventory list RPC pagination should be applied before aggregation.
- Current Inventory and Movement Ledger route support exists, but workspace item activation/permissions must be verified.
- `src/lib/inventory-api.ts` still exposes legacy write helpers for out-of-scope inventory operations.

Do not start Purchase Orders or new inventory transaction types until these are clean.

---

# A. Review And Docs

- [x] GPT review report: `docs/ai-runs/2026-06-01_gpt-review-phase-4-3-grn-hardening.md`
- [ ] Create or fix `docs/ai-runs/2026-06-01_phase-4-3-grn-ui-hardening.md`
- [ ] Update `progress.md` with Phase 4.2 final summary
- [ ] Update `progress.md` with Phase 4.3 final summary
- [ ] Ensure final commit hashes are correct in Phase 4.2/4.3 reports
- [ ] Create `docs/PHASE_4_4_GRN_INVENTORY_PRODUCTION_HARDENING.md`
- [ ] Create AI run report: `docs/ai-runs/2026-06-01_phase-4-4-grn-inventory-production-hardening.md`

---

# B. Inventory RPC SQL Hardening

Create migration:

- [ ] `supabase/migrations/0037_inventory_list_rpcs_hardening.sql`

Fix RPCs:

- [ ] `wh_list_current_inventory`
- [ ] `wh_list_inventory_movements`

Required behavior:

- [ ] Return `[]`, not `null`, when no rows exist.
- [ ] Apply filtering, ordering, limit, and offset before JSON aggregation.
- [ ] Keep permission checks.
- [ ] Keep response shape: `{ ok: true, data: [...] }` or `{ ok: false, error: ... }`.
- [ ] Verify no SQL ambiguity or search_path risk.

Suggested structure:

```sql
with rows as (
  select ...
  from ...
  where ...
  order by ...
  limit ... offset ...
)
select coalesce(jsonb_agg(jsonb_build_object(...)), '[]'::jsonb) from rows;
```

---

# C. Workspace Visibility Verification

Verify metadata and permissions for:

- [ ] Inventory → Current Stock / Current Inventory
- [ ] Inventory → Movements Ledger

Tasks:

- [ ] Confirm workspace items exist.
- [ ] Confirm `item_key` matches `DynamicRouteRenderer` cases:
  - `current_inventory`
  - `movements`
- [ ] Confirm active/inactive state is intentional.
- [ ] If the views should be visible now, activate them safely.
- [ ] Confirm required permissions exist and are granted:
  - `view_current_inventory`
  - `view_inventory_movements`
- [ ] Browser verify both menu items appear for owner/admin user.

If keeping either item inactive, document the reason.

---

# D. Inventory API Cleanup

Review:

- [ ] `src/lib/inventory-api.ts`

Problem:

The file contains new read-only wrappers, but also legacy write helpers for out-of-scope operations such as transfers, adjustments, reservations, valuation, and old GRN flows. Some may reference dropped or unimplemented backend functions/tables.

Tasks:

- [ ] Move new read-only wrappers into a clean section or separate file if needed.
- [ ] Mark legacy out-of-scope helpers as deprecated with comments.
- [ ] Do not expose legacy write helpers to current UI.
- [ ] If any legacy helper references dropped tables/functions and causes type/build risk, remove or isolate it.
- [ ] Keep product/UOM exports only if existing app imports require them.
- [ ] Document cleanup decision in AI run report.

Preferred final direction:

- `src/lib/inventory-api.ts` = current inventory and movement read-only APIs only
- old experimental stock operation helpers removed or moved to a clearly deprecated file only if still needed

---

# E. Authenticated Browser Verification Evidence

Re-run or confirm real browser flow against Supabase Cloud:

- [ ] Purchasing → GRN opens.
- [ ] Draft GRN can be created.
- [ ] Draft can be posted.
- [ ] Posted detail shows readable labels.
- [ ] Inventory → Current Inventory opens and shows rows or empty state.
- [ ] Inventory → Movements Ledger opens and shows rows or empty state.
- [ ] No raw UUID leakage in normal user-facing cells where labels are available.

Screenshots should be committed if possible under:

```text
docs/ai-runs/screenshots/phase-4-4-production-hardening/
```

If screenshots are local-only, state that clearly.

---

# F. Test And Simulation

Update tests if needed:

- [ ] Inventory RPC empty result returns array.
- [ ] Current Inventory page handles empty array.
- [ ] Movements page handles empty array.
- [ ] No tests rely on `null` response for empty inventory.

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Document exact counts. Do not leave contradictory old test counts.

---

# G. Supabase Cloud Verification

- [ ] Apply migration 0037 to Supabase Cloud.
- [ ] Run relevant simulation or SQL verification for inventory list RPCs.
- [ ] Verify empty tenant/current filters return `[]` not `null`.
- [ ] Verify permissions still block unauthorized access.

---

# H. Acceptance Criteria

Phase 4.4 is complete only when:

- [ ] Missing Phase 4.3 AI run report exists.
- [ ] `progress.md` has clear Phase 4.2 and 4.3 summaries.
- [ ] Inventory list RPCs return arrays and paginate correctly.
- [ ] Current Inventory / Movements workspace visibility is verified or intentionally documented.
- [ ] Legacy inventory API risk is cleaned up or clearly deprecated.
- [ ] Supabase Cloud verification is documented.
- [ ] Browser verification is documented.
- [ ] Test/build results are documented.

After Phase 4.4, proceed to Phase 4.5: GRN cancellation/reversal architecture.
