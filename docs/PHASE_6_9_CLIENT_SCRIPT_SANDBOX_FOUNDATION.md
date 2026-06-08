# Phase 6.9: Client Script Sandbox Foundation

## Status
Active development — not yet complete.

## Goal
Add a safe, Frappe-like Client Script foundation for metadata-driven DocTypes, without allowing arbitrary unsafe JavaScript execution.

## Design Principles
- **Frontend scripts are UX-only.** Backend/RPC remains the source of truth.
- **No raw JavaScript execution.** No `eval()`, no `Function()` constructor.
- **JSON-rule DSL** instead of JavaScript — safe, declarative, auditable.
- **No access to** `window`, `document`, `localStorage`, `sessionStorage`, `cookies`, `fetch`, `XMLHttpRequest`, Supabase client, or arbitrary DOM.
- **No backend permission bypass.** Scripts cannot change `docstatus`/`workflow_state` directly.
- **Script errors are non-fatal UI warnings.**

## Architecture

### Database (`app.erp_client_scripts`)
- Company-scoped (nullable `company_id` for global/standard scripts)
- Linked to `app.erp_doctypes` via `doctype_key`
- Only `script_type = 'form'` allowed
- Only `event_name` in `onLoad`, `onFieldChange`, `beforeSaveClientValidation` allowed
- RLS: all authenticated can read enabled scripts; only admin/managers can write
- Standard scripts protected from non-admin modification

### JSON-Rule DSL
Script body is a JSON object with a `rules` array:
```json
{
  "rules": [
    {
      "when": {
        "field": "status",
        "operator": "equals",
        "value": "Qualified"
      },
      "actions": [
        { "type": "setRequired", "field": "expected_value", "value": true },
        { "type": "showMessage", "level": "info", "message": "..." }
      ]
    }
  ]
}
```

### Supported Operators
- `equals`, `not_equals`, `in`, `not_in`, `is_set`, `is_not_set`

### Supported Actions (Safe Only)
- `setValue` — set form field value
- `setRequired` — mark field required
- `setReadOnly` — mark field read-only
- `setVisible` — show field
- `showMessage` — show info/warning/error message
- `validateRequired` — validate field is not empty
- `computeTemplateValue` — compute template value from allowed form fields

### Actions NOT Supported
- `eval`, `Function`, API calls, DOM access, server scripts, background jobs, database writes, permission changes, workflow transition calls

### Frontend Integration
- `src/lib/client-scripts/sandbox.ts` — pure evaluation engine, no DOM access
- `src/lib/client-scripts/useClientScripts.ts` — React hook for loading + evaluating
- `src/components/metadata/DynamicFormPage.tsx` — hooks into handleSubmit, field changes, onLoad
- `src/components/client-scripts/ClientScriptsPage.tsx` — management UI
- `src/lib/client-scripts-api.ts` — RPC wrappers

### Backend RPCs
| RPC | Purpose |
|-----|---------|
| `erp_list_client_scripts()` | List all scripts (management) |
| `erp_get_client_scripts_for_doctype(p_doctype_key, p_company_id)` | Load enabled scripts for a DocType |
| `erp_create_client_script(...)` | Create a new script |
| `erp_update_client_script(...)` | Update script fields |
| `erp_disable_client_script(p_id, p_is_enabled)` | Enable/disable script |
| `erp_delete_client_script(p_id)` | Delete script (non-standard only) |

### Permissions
- `view_client_scripts`, `create_client_script`, `update_client_script`, `delete_client_script`, `manage_client_scripts`
- Granted to owner/admin system roles
- `manage_client_scripts` is the master gate for all management RPCs
- Normal form users can only load enabled scripts for DocTypes they can access

### CRM Lead Demo Script
- **Rule A:** When `status = Qualified` → `expected_value` becomes required + info message
- **Rule B:** When `source = Referral` → `referral_name` becomes visible
- Fields `expected_value` (Float) and `referral_name` (Data) added to CRM Lead

## Security Proof
1. No raw JS execution — JSON-rule DSL only
2. No `eval()` or `Function()` anywhere
3. No access to `window`, `document`, `localStorage`, `fetch` from sandbox
4. UNSAFE_FIELDS list blocks `docstatus`, `workflow_state`, `created_by`, etc.
5. Restricted users blocked from script management
6. Cross-company access fails
7. Script errors caught and shown as non-fatal warnings
8. Backend permissions never bypassed

## Remaining Gaps
- No `onLoad` event script seed yet
- `beforeSaveClientValidation` event not separately seeded
- Full visual Form Layout Builder deferred
- Script management UI is basic (no visual rule builder)
- No `setReadOnly` demo rule yet
- No `computeTemplateValue` demo yet
- onFieldChange for non-Select fields may need optimization
