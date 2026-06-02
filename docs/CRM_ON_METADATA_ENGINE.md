# CRM On Metadata Engine — Feasibility Analysis

**Date:** 2026-06-01
**Author:** AI Run

---

## 1. Can CRM Be Built With Metadata/Generic JSON?

**Yes — for master/simple record types.**

The metadata engine supports:
- `generic_json` storage strategy — stores records in `erp_documents` as JSON
- CRUD via auto-detected API (`detectAndRegisterGenericDocTypeApi`)
- Dynamic list/form rendering from metadata
- Permission-catalog-based access control
- Workspace sidebar integration

This means CRM entities that are primarily **document records** (create, read, update, deactivate, filter, search) can be built entirely through Metadata Studio without writing any backend code.

---

## 2. CRM Entities Suitable For Metadata-Driven Approach

| Entity | Type | Feasibility | Notes |
|--------|------|-------------|-------|
| **Lead** | Master record | ✅ High | Name, status, source, notes, assigned_to — all simple fields |
| **Contact** | Master record | ✅ High | Name, email, phone, company, address — simple fields |
| **Account** | Master record | ✅ High | Company name, industry, tier, website — simple fields |
| **Opportunity** | Tracking record | ✅ High | Deal name, amount, stage, close date, probability |
| **Task / Follow-up** | Activity record | ✅ High | Subject, due date, status, assigned_to, description |
| **Activity Log** | History record | ✅ High | Type, notes, timestamp, linked_to (Link field) |
| **Email Template** | Configuration | ✅ High | Subject, body, variables — simple fields |

Each of these can be created using the same pattern as the Purchase Invoice demo:
1. Create DocType with `generic_json` storage
2. Add DocFields
3. Create List View + Form Layout
4. Add DocType Actions with permission keys
5. Add Workspace Item
6. Use Check/Repair tool to complete permissions

---

## 3. CRM Features That Need Explicit Backend

| Feature | Why Not Metadata-Driven |
|---------|------------------------|
| **Email sync** (IMAP/POP3) | Needs external service integration, webhooks, background jobs |
| **Call log integration** (Twilio, etc.) | External API calls, real-time events |
| **Lead scoring automation** | Business logic, rule engine, scheduled evaluation |
| **Pipeline forecast calculations** | Aggregation queries across stages, weighted probability math |
| **Workflow automation** | Requires workflow state machine + transition actions |
| **Email campaign delivery** | External SMTP/MailChimp API, tracking pixels, bounce handling |
| **Calendar/meeting sync** | iCal/Google Calendar API integration |

These features would need explicit RPCs or backend services. They are **not** suitable for `generic_json` alone.

---

## 4. Why GRN Uses Custom RPCs (Not Metadata-Driven)

The **Goods Receipt Note** (GRN) was implemented as custom React components + explicit RPCs because:

| GRN Requirement | Why Generic JSON Would Fail |
|-----------------|-----------------------------|
| **Inventory quantity changes** | Posting a GRN updates `wh.current_inventory` (numeric quantity) — generic_json has no concept of stock |
| **Movement ledger entries** | Each GRN receipt creates an immutable `wh.inventory_movements` row with audit trail |
| **Atomic transactions** | Post and Cancel operations must succeed or roll back entirely across multiple tables |
| **Stock consumption guard** | Cancel checks `on_hand_qty >= accepted_qty` before reversing — requires real-time `SELECT ... FOR UPDATE` |
| **Batch/lot tracking** | Creates/links `wh.inventory_batches` records with expiry tracking |
| **Bin assignment** | Links to `wh.warehouse_bins` via FK constraint |
| **State machine** | Status flow: `draft → posted → cancelled` with business rules at each transition |

**Rule:** Any feature that **changes numeric inventory quantities** or **creates financial ledger entries** needs explicit RPCs and physical tables, not generic JSON.

---

## 5. Future: Accounting / Transaction Documents

The same principle applies to:

| Module | Approach |
|--------|----------|
| **Purchase Orders** | Status workflow, but no inventory impact — could be hybrid (generic_json with a few RPCs for submit/approve) |
| **Sales Invoices** | Financial impact — needs physical tables + explicit RPCs |
| **Payment Entries** | Financial impact — needs explicit RPCs |
| **Stock Transfers** | Inventory movement — needs explicit RPCs (future phase) |
| **Stock Adjustments** | Inventory movement — needs explicit RPCs |

---

## 6. Recommendation: CRM As Metadata-First Prototype

**Phase proposal:**
1. Create Lead, Contact, Account, Opportunity as `generic_json` DocTypes via Metadata Studio
2. Add workspace items under a new CRM workspace
3. Verify CRUD works for all entities
4. Add Link fields between entities (e.g., Opportunity → Account)
5. Build one or two simple dashboard pages for pipeline view

This would validate the metadata engine's ability to support a real business module without backend code.

Only after validation would CRM process-heavy features (email sync, scoring, forecasting) need explicit backend services.

---

## Summary

| Aspect | Verdict |
|--------|---------|
| CRM masters (Lead, Contact, Account) | ✅ Buildable with metadata/generic_json now |
| CRM processes (email, scoring, forecast) | ❌ Needs explicit backend services later |
| GRN-style inventory transactions | ❌ Always needs custom RPCs |
| Purchase Orders (status + print) | ⚠️ Hybrid — metadata fields + a few RPCs |
| Accounting documents | ❌ Needs physical tables + explicit RPCs |
