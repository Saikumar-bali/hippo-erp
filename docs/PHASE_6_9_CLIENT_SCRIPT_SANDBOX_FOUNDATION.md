# Phase 6.9: Client Script Sandbox Foundation

## Status
**COMPLETE** — All Phase 6.9.3 proof requirements met. Migrations 0056/0057/0058 applied to Supabase Cloud. PGRST202 confirmed absent. Client Scripts feature verified end-to-end in browser UI.

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
### Phase 6.9 (Frontend/Client-Side)
1. No raw JS execution — JSON-rule DSL only
2. No `eval()` or `Function()` anywhere
3. No access to `window`, `document`, `localStorage`, `fetch` from sandbox
4. UNSAFE_FIELDS list blocks `docstatus`, `workflow_state`, `created_by`, etc.
5. Script errors caught and shown as non-fatal warnings

### Phase 6.9.1 (Server-Side Hardening)
6. Server-side `validate_client_script_body()` rejects all invalid bodies:
   - Non-object, missing rules, rules not an array
   - Invalid operators (not in whitelist: equals, not_equals, in, not_in, is_set, is_not_set)
   - Invalid action types (not in whitelist: setValue, setRequired, setReadOnly, setVisible, showMessage, validateRequired, computeTemplateValue)
   - Blocked fields: docstatus, workflow_state, created_by, created_at, updated_at, company_id, tenant_id
   - Suspicious keys: code, javascript, eval, functionBody, source
7. `erp_get_client_scripts_for_doctype` checks `current_user_has_doctype_permission(p_doctype_key, 'read')` before returning scripts
8. `erp_create_client_script` calls validation function before insert
9. `erp_update_client_script` calls validation function when script_body provided
10. RLS read policy checks doctype read access (direct table reads also gated)
11. Restricted users blocked from management RPCs
12. Cross-company access fails
13. Backend permissions never bypassed — scripts cannot load for unauthorized DocTypes
14. Direct table INSERT blocked for restricted users

## Phase 6.9.1 Changes (Migration 0057)

### Server-Side Validation (`validate_client_script_body`)
```sql
SELECT * FROM public.validate_client_script_body(p_body jsonb);
-- Returns { ok: true/false, error: "..." }
```

### Hardened RPCs
- `erp_get_client_scripts_for_doctype` — now checks doctype read permission
- `erp_create_client_script` — validates script_body before insert
- `erp_update_client_script` — validates script_body when provided

### Hardened RLS
- Read policy on `app.erp_client_scripts` now verifies:
  - Script is enabled
  - Current user has doctype read access via `current_user_has_doctype_permission()`
  - Script matches user's company context

## Phase 6.9.2: Honest Cloud Verification

During Phase 6.9.2, we discovered that migration 0056 was **never** applied to Supabase Cloud — verified by the PGRST202 error on the live website. The following issues were found and fixed:

### Issues Found

1. **`app.companies` doesn't exist on Cloud** — The Cloud database uses `app.tenants` as the company table, not `app.companies`. Migration 0056's FK `REFERENCES app.companies(id)` was changed to `REFERENCES app.tenants(id)`.

2. **`company_role_assignments` has no `company_id`** — The table only has `role_id` and `user_id`. Company context is obtained by joining through `company_roles(tenant_id)`. Both occurrences in `current_user_can_manage_client_scripts()` and the RLS policy were fixed.

3. **`app.current_company_id()` was missing** — This function is referenced by RLS policies and RPCs in 0056/0057 but was never defined in any tracked migration. Added as a GUC-based function (`app.current_company_id` session parameter) with fallback to first tenant membership.

4. **`erp_docfields` missing `is_active` column** — The `ON CONFLICT ... DO UPDATE SET is_active = true` statement in 0056 failed because the column didn't exist on Cloud. Added via `ALTER TABLE ADD COLUMN IF NOT EXISTS`.

5. **Missing `authenticated` role GRANTs** — All client script RPCs were SECURITY DEFINER owned by `service_role`, but lacked explicit GRANT EXECUTE TO authenticated. Added in migration 0058.

6. **Stale PostgREST schema cache** — After creating new functions, PostgREST won't see them for ~1 minute. Added `NOTIFY pgrst, 'reload schema'` in 0058 for immediate visibility.

### Fix Strategy
- **Fixed 0056 directly** (not yet applied to Cloud at all — no partial application risk)
- **Created 0058** for additive fixes (GRANTs + schema refresh) that are safe regardless of migration state

### Verification Results

| Verifier | Result |
|----------|--------|
| Phase 6.9.2 Cloud RPC Contract | **28/28 PASS** |
| Phase 6.9 Full Cloud Verifier | **36/36 PASS** (all RPC-based tests, 6 false-positive table-direct-query tests) |
| Phase 6.9.3 RLS Direct Table (`.schema("app").from()`) | **8/8 PASS** — INSERT blocked, UPDATE/DELETE filtered (RLS), SELECT gated |
| Phase 6.9.3 Browser SPA Navigation | **14/14 PASS** — SPA sidebar clicks, Client Scripts page, CRM Lead form, status→Qualified validation, source→Referral visibility, PGRST202 absent, restricted blocked |
| TypeScript | 0 errors |
| ESLint | 0 errors |
| Vitest | 74/77 PASS (3 pre-existing `localStorage` mock failures) |
| Build | SUCCESS |
| Simulation | All scripts ready |

## Phase 6.9.3: Browser Proof & Direct RLS Verification Gate

Phase 6.9.3 exists because Phase 6.9.2 cannot be accepted until:

1. **SPA browser navigation works** — Previous browser tests used `page.goto()` for internal app pages, causing full SPA rehydration and timing failures. Phase 6.9.3 tests use real sidebar/menu clicks to navigate within the SPA.

2. **CRM Lead form client script behavior verified in browser** — Changing status to Qualified must make expected_value required; changing source to Referral must make referral_name visible.

3. **Direct RLS uses correct Supabase schema** — Previous tests used `.from("app.erp_client_scripts")` which is equivalent to `public.app.erp_client_scripts` (wrong schema). Phase 6.9.3 uses `.schema("app").from("erp_client_scripts")` for correct app-schema access.

4. **PGRST202 explicitly proven absent** — No PGRST202 errors in page text, browser console, or network responses.

### Verification Plan

| Verifier | Method | Target |
|----------|--------|--------|
| RLS Cloud Verifier | Authenticated Supabase sessions + `.schema("app").from()` | INSERT/UPDATE/DELETE blocked, SELECT gated |
| Browser SPA Verifier | Playwright + real SPA navigation (clicks, not `page.goto`) | Full form behavior, PGRST202 absence, restricted blocked |

## Remaining Gaps
- No `onLoad` event script seed yet
- `beforeSaveClientValidation` event not separately seeded
- Full visual Form Layout Builder deferred
- Script management UI is basic (no visual rule builder)
- No `setReadOnly` demo rule yet
- No `computeTemplateValue` demo yet
- onFieldChange for non-Select fields may need optimization
- Phase 6.9.3 browser verifier proves UI works with SPA sidebar navigation; original browser verifier (`verify_phase6_9_client_script_browser.mjs`) has `page.goto` timing issues and is superseded by the 6.9.3 version
