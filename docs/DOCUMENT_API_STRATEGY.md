# Document API Strategy

## Safe Now

The following metadata-driven operations are safe in the current phase:

1. **Metadata-driven read/list** for approved DocTypes (product_category, unit_of_measure, product).
   - List loads metadata from `app.erp_list_views` + `app.erp_docfields`.
   - Data is fetched through existing RPC-backed product APIs.
   - Permissions are checked via existing permission system.

2. **Metadata-driven form rendering** using existing product APIs.
   - Form layout loads from `app.erp_form_layouts`.
   - Save operations delegate to existing `product-api.ts` RPC functions.
   - No unsafe generic write path.

3. **Metadata-driven detail pages** using existing get-RPCs.
   - Detail layout loads from form layout metadata.
   - Data reloads through existing get-product/category/uom RPCs.

## Not Safe Yet

The following are explicitly NOT implemented in this phase:

- Arbitrary table writes from frontend metadata.
- Arbitrary field writes (frontend sends only whitelisted fields).
- Dynamic user-created DocTypes (no UI for creating schemas).
- Dynamic database table creation from UI.

## Future Safe Generic API Design

When generic document APIs are added, they MUST follow these rules:

### `erp_list_documents(doctype_key, filters)`
- Validate `doctype_key` exists in `app.erp_doctypes` and is active.
- Whitelist schema/table from `app.erp_doctypes.schema_name` + `app.erp_doctypes.table_name`.
- Enforce company context via `tenant_id` or `company_id` filter.
- Enforce read permissions via `app.erp_doctype_actions` for the `read` action.
- Never accept raw SQL or table names from frontend.

### `erp_get_document(doctype_key, id)`
- Same validation as list.
- Single record by UUID.
- Company-scoped.

### `erp_create_document(doctype_key, data)`
- Whitelist allowed fields from `app.erp_docfields`.
- Validate required fields.
- Enforce `create` permission.
- Enforce company context.
- Apply default values from field metadata.
- Validate field types and constraints.
- Log audit entry.

### `erp_update_document(doctype_key, id, data)`
- Same field whitelisting as create.
- Enforce `update` permission.
- Do not allow updating immutable fields (id, created_at, created_by, doctype_key).
- Log audit entry.

### `erp_deactivate_document(doctype_key, id)`
- Enforce `deactivate` permission.
- Soft delete only (set `is_active = false`).
- Log audit entry.

## Implementation Notes

- Generic APIs must use `SECURITY DEFINER` carefully or run in a trusted Node backend.
- Audit log should record: user_id, company_id, doctype_key, document_id, action, old_values, new_values, timestamp.
- Stock-changing DocTypes (GRN, Stock Transfer, Stock Adjustment) must NEVER use the generic write path.
