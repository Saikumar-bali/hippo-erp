# Manual DocType Creation Guide

This guide walks through creating a **Purchase Invoice** DocType manually from the browser using Metadata Studio.

> **⚠️ Important:** This creates a **generic_json demo** — data is stored as JSON, not in proper accounting tables. A real Purchase Invoice should eventually use explicit RPCs and physical tables. This demo is only for learning metadata-driven app creation.

---

## Prerequisites

- Owner or Admin user with `manage_metadata` permission
- Metadata Studio accessible from the sidebar

---

## Step-by-Step: Create Purchase Invoice

### 1. Create the DocType

1. Open **Metadata Studio** from the sidebar.
2. Click **DocTypes** under Recommended Workflow.
3. Click **Create Record** (blue button in header).
4. Fill in:

| Field | Value |
|-------|-------|
| DocType Key | `purchase_invoice` |
| Module Key | `purchasing` |
| Label | `Purchase Invoice` |
| Description | `Supplier invoice record` |
| Schema Name | `app` |
| Table Name | `erp_documents` |
| Route | `purchase_invoice` |
| Storage Strategy | `generic_json` |
| Company Scoped | `true` (checked) |
| Active | `true` (checked) |

5. Click **Save**.

---

### 2. Create DocFields

1. In Metadata Studio, click **DocFields**.
2. Click **Create Record**.
3. Create each field listed below (one at a time):

| # | Field Name | Label | Field Type | Required | In List View | In Filter | Sort Order |
|---|-----------|-------|-----------|----------|-------------|-----------|-----------|
| 1 | `invoice_number` | Invoice Number | `Data` | ✓ | ✓ | ✓ | 1 |
| 2 | `supplier_name` | Supplier Name | `Data` | ✓ | ✓ | ✓ | 2 |
| 3 | `invoice_date` | Invoice Date | `Date` | ✓ | ✓ | ✓ | 3 |
| 4 | `due_date` | Due Date | `Date` | | | | 4 |
| 5 | `total_amount` | Total Amount | `Float` | ✓ | ✓ | | 5 |
| 6 | `status` | Status | `Select` | ✓ | ✓ | ✓ | 6 |
| 7 | `notes` | Notes | `Text` | | | | 7 |
| 8 | `is_active` | Active | `Check` | | ✓ | ✓ | 8 |

For the **Status** field, set **Options (JSON)** to:
```json
["Draft", "Submitted", "Cancelled"]
```

After creating all fields, the DocFields list for `purchase_invoice` should show 8 entries.

---

### 3. Create List View

1. Click **List Views** in Metadata Studio.
2. Click **Create Record**.
3. Fill in:

| Field | Value |
|-------|-------|
| DocType Key | `purchase_invoice` |
| View Key | `default` |
| Label | `Default` |
| Columns (JSON) | See below |
| Is Default | ✓ |

**Columns JSON:**
```json
[
  {"fieldname": "invoice_number", "label": "Invoice Number", "width": 150},
  {"fieldname": "supplier_name", "label": "Supplier", "width": 200},
  {"fieldname": "invoice_date", "label": "Date", "width": 120},
  {"fieldname": "total_amount", "label": "Amount", "width": 120},
  {"fieldname": "status", "label": "Status", "width": 100},
  {"fieldname": "is_active", "label": "Active", "width": 80}
]
```

---

### 4. Create Form Layout

1. Click **Form Layouts** in Metadata Studio.
2. Click **Create Record**.
3. Fill in:

| Field | Value |
|-------|-------|
| DocType Key | `purchase_invoice` |
| Layout Key | `default` |
| Label | `Default` |
| Sections (JSON) | See below |
| Is Default | ✓ |

**Sections JSON:**
```json
[
  {
    "section_label": "Invoice Details",
    "columns": [
      {"fieldname": "invoice_number", "label": "Invoice Number"},
      {"fieldname": "supplier_name", "label": "Supplier Name"},
      {"fieldname": "invoice_date", "label": "Invoice Date"},
      {"fieldname": "due_date", "label": "Due Date"},
      {"fieldname": "total_amount", "label": "Total Amount"},
      {"fieldname": "status", "label": "Status"}
    ]
  },
  {
    "section_label": "Additional",
    "columns": [
      {"fieldname": "notes", "label": "Notes"},
      {"fieldname": "is_active", "label": "Active"}
    ]
  }
]
```

---

### 5. Create DocType Actions

1. Click **DocType Actions** in Metadata Studio.
2. Click **Create Record** four times for each action:

| Action Key | Permission Key |
|-----------|---------------|
| `read` | `view_purchase_invoice` |
| `create` | `create_purchase_invoice` |
| `update` | `update_purchase_invoice` |
| `deactivate` | `delete_purchase_invoice` |

---

### 6. Check / Repair

1. Go to **Metadata Studio → Check / Repair DocType**.
2. Enter `purchase_invoice` and click **Check**.
3. If any items show ERROR, click **Fix**.

This will automatically:
- Create missing permission keys in the catalog
- Grant permissions to owner/admin roles
- Activate the workspace item if needed

---

### 7. Add Workspace Item

If the workspace item was not auto-created:

1. Go to **Workspace Items** in Metadata Studio.
2. Click **Create Record**.
3. Fill in:

| Field | Value |
|-------|-------|
| Workspace Key | `purchasing` |
| Item Key | `purchase_invoice` |
| Label | `Purchase Invoices` |
| Item Type | `doctype` |
| Target | `purchase_invoice` |
| Required Permission Key | `view_purchase_invoice` |
| Active | ✓ |

---

### 8. Verify

1. Refresh the sidebar.
2. The **Purchasing** workspace should now show **Purchase Invoices**.
3. Click it — you should see an empty list with a **Create** button.
4. Click **Create** and fill in the form to create a test record.
5. Edit the record.
6. Deactivate the record.

---

## Permissions Reference

| Permission Key | Module | Description |
|---------------|--------|-------------|
| `view_purchase_invoice` | Purchasing | View Purchase Invoice records |
| `create_purchase_invoice` | Purchasing | Create Purchase Invoices |
| `update_purchase_invoice` | Purchasing | Update Purchase Invoices |
| `delete_purchase_invoice` | Purchasing | Deactivate Purchase Invoices |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Unknown DocType" in menu | DocType not created — go to DocTypes and create it |
| "Permission denied: view_purchase_invoice" | Open Check/Repair DocType, run fix for permissions |
| Empty list with no Create button | Missing List View or Form Layout — create them in Metadata Studio |
| Menu item missing from sidebar | Workspace Item not created or inactive — add it in Workspace Items |
| Record saves but fields are empty | DocFields may not match form layout field names exactly |
