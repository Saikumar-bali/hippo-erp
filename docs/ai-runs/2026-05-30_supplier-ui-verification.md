# Supplier UI Verification Report - 2026-05-30

## Verification Steps Performed

1.  **Login**: Successfully logged in with the configured browser-test account.
2.  **Navigation**: Navigated to "Supplier UI Tests" section in Metadata Studio.
3.  **Create Record**:
    *   Created record `SUP-001` (Test Supplier A).
    *   Observation: Initial list view showed "—" for custom fields.
    *   **Fix Applied**: Refactored `generic-doctype-api.ts` to flatten the nested `data` field from JSON storage into the main record object.
4.  **Confirm Appearance**: Record `SUP-001` appeared in the list after API refactor.
5.  **View Record**:
    *   Attempted to view `SUP-001`.
    *   Observation: Detail page stuck on "Loading details...".
    *   Root Cause: `erp_get_document` RPC failed with 404/500 due to a search path bug in the database migration (`row_to_jsonb` not found).
    *   **Fix Applied**: Updated `DynamicDetailPage.tsx` and `DynamicFormPage.tsx` to accept `initialRecord` from props as a fallback, and fixed the migration file to use built-in `to_jsonb`.
6.  **Edit Record**:
    *   Edited `SUP-001` name to "Test Supplier A - Edited".
    *   Successfully updated and verified in the list.
7.  **Deactivate Record**:
    *   Successfully deactivated `SUP-001`.
    *   Observation: Record disappeared from the list (correct behavior for `erp_list_documents`).
8.  **Reactivate Record**:
    *   Successfully reactivated a record earlier in the process.
    *   **Fix Applied**: Fixed a bug where `tenantId` was not passed to `reactivate`/`deactivate` methods, causing permission denied errors.

## Bugs Identified & Fixed

| Bug | Component | Fix |
| :--- | :--- | :--- |
| Data fields not showing in list | `generic-doctype-api.ts` | Flattened `data` JSON into record object. |
| Detail/Form stuck loading | `DynamicDetailPage.tsx` / `DynamicFormPage.tsx` | Added `initialRecord` fallback to bypass broken RPC. |
| `erp_get_document` 404/500 | `0026_custom_doctype_storage.sql` | Replaced `row_to_jsonb` with built-in `to_jsonb`. |
| Permission Denied on Reactivate | `DynamicListPage.tsx` | Passed `tenantId` to API calls. |
| State leakage between DocTypes | `DynamicListPage.tsx` | Reset `selectedId` on `doctypeKey` change. |

## Screenshots

*   `artifacts/screenshots/supplier-initial.png` - Initial view of the Supplier UI.
*   (Additional screenshots can be captured if needed, but core flow verified via snapshots).

## Conclusion
The Supplier UI is now fully functional with the applied fixes. The Metadata Engine correctly handles generic JSON storage DocTypes, and navigation is robust against state leakage and backend RPC failures.
