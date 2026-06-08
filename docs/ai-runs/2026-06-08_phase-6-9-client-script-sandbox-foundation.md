# Phase 6.9 — Client Script Sandbox Foundation

**Date:** 2026-06-08
**Branch:** phase-2.5-metadata-engine

## Summary

Added a safe, Frappe-like Client Script foundation for metadata-driven DocTypes. Client Scripts use a JSON-rule DSL (not JavaScript) to define safe form behavior — no `eval()`, no `Function()` constructor, no access to `window`/`document`/`localStorage`/`fetch`.

**Important distinction:**
This is NOT the future full Module Builder/App Builder.
Phase 6.9 provides a controlled sandbox for UI form scripts.
Full Module Builder, App Builder, Purchase Orders, Purchase Invoice, Fleet, and other business modules are deferred.

## What Was Done

### 1. Database Migration (`supabase/migrations/0056_client_script_sandbox_foundation.sql`)
- Created `app.erp_client_scripts` table with constraints:
  - `script_type` restricted to `'form'`
  - `event_name` restricted to `'onLoad'`, `'onFieldChange'`, `'beforeSaveClientValidation'`
  - Unique per `(company_id, doctype_key, script_name)`
  - RLS policies for read/manage
- Created `public.current_user_can_manage_client_scripts()` helper
- Created 6 RPCs for client script CRUD
- Seeded 5 permissions, granted to owner/admin
- Added `expected_value` (Float) and `referral_name` (Data) fields to CRM Lead
- Updated CRM Lead form layout to include new fields
- Seeded CRM Lead demo client script with qualification rules

### 2. Sandbox Engine (`src/lib/client-scripts/sandbox.ts`)
- Pure evaluation functions with no DOM access
- Supports 6 operators: `equals`, `not_equals`, `in`, `not_in`, `is_set`, `is_not_set`
- Supports 7 safe action types: `setValue`, `setRequired`, `setReadOnly`, `setVisible`, `showMessage`, `validateRequired`, `computeTemplateValue`
- Blocks modification of `docstatus`, `workflow_state`, `created_by`, `created_at`, `updated_at`

### 3. React Hook (`src/lib/client-scripts/useClientScripts.ts`)
- Loads enabled scripts for a DocType via RPC
- Provides `runOnLoad()`, `runOnFieldChange(field)`, `runBeforeSaveValidation()` evaluators
- Exposes script overrides (required fields, readonly fields, visible fields, messages)

### 4. DynamicFormPage Integration (`src/components/metadata/DynamicFormPage.tsx`)
- Tracks `formValues` state via onChange handlers on all inputs
- Runs `onLoad` scripts after mount/form data load
- Runs `onFieldChange` when any form field changes
- Runs `beforeSaveClientValidation` before frontend save attempt
- Applies script overrides (required, readonly, visible) to field rendering
- Shows script messages as toast notifications

### 5. Management UI (`src/components/client-scripts/ClientScriptsPage.tsx`)
- List all client scripts with DocType, name, event, status
- Create/edit script form with JSON body editor
- Enable/disable toggle
- Delete scripts (non-standard only)

### 6. Route and Sidebar
- Added `metadata_studio_client_scripts` route in DynamicRouteRenderer
- Added `Client Scripts` shortcut to Metadata Studio sidebar

### 7. Frontend API (`src/lib/client-scripts-api.ts`)
- Type-safe RPC wrappers for all 6 RPCs

## Files Changed/Created

| File | Action |
|------|--------|
| `supabase/migrations/0056_client_script_sandbox_foundation.sql` | Created |
| `src/lib/client-scripts/sandbox.ts` | Created |
| `src/lib/client-scripts/useClientScripts.ts` | Created |
| `src/lib/client-scripts-api.ts` | Created |
| `src/components/client-scripts/ClientScriptsPage.tsx` | Created |
| `src/components/metadata/DynamicFormPage.tsx` | Modified |
| `src/components/metadata/DynamicRouteRenderer.tsx` | Modified |
| `src/hooks/useWorkspaceNavigation.ts` | Modified |
| `docs/PHASE_6_9_CLIENT_SCRIPT_SANDBOX_FOUNDATION.md` | Created |
| `scripts/verify_phase6_9_client_script_cloud.mjs` | Created |
| `scripts/verify_phase6_9_client_script_browser.mjs` | Created |
| `tasks.md` | Updated |
| `progress.md` | Updated |

## Permission Model

- `manage_client_scripts` is the master gate for script management RPCs
- `view_client_scripts`, `create_client_script`, `update_client_script`, `delete_client_script` are granular permissions
- All granted to owner/admin system roles
- Normal form users can only load enabled scripts for DocTypes they can access
- Cross-company access fails

## Security Design

1. **No raw JavaScript execution** — JSON-rule DSL only
2. **No eval() or Function()** — the sandbox has zero code execution primitives
3. **No access to browser APIs** — sandbox functions receive only form values and field metadata
4. **Unsafe fields blocked** — `docstatus`, `workflow_state`, `created_by`, `created_at`, `updated_at` cannot be modified
5. **Action type whitelist** — only 7 safe action types are allowed
6. **Script errors are non-fatal** — caught and shown as UI warnings
7. **Backend is source of truth** — scripts only affect frontend UX, never backend validation

## Hard Failure Rules Respected
- No `eval()` or `Function()` used
- No access to `window`/`document`/`localStorage`/`fetch` from sandbox
- No backend permission bypass possible
- Scripts cannot change `docstatus`/`workflow_state` directly
- Restricted users cannot manage scripts
- Full Module Builder/App Builder NOT started
- Purchase Orders, Purchase Invoice, Fleet NOT started

## Command Results

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint src/` | ✅ 0 errors, 58 warnings (pre-existing) |
| `npx vitest run` | ✅ 74/77 PASS (3 pre-existing failures unrelated) |
| `npx vite build` | ✅ SUCCESS |
| `node scripts/run-simulation.cjs` | ✅ Simulation scripts ready |

**Note:** Cloud verifier and browser verifier require Supabase Cloud migration 0056 to be applied first, along with a running dev server. These have not yet been run.

## Remaining Gaps
- `onLoad` event script not yet seeded as demo
- `beforeSaveClientValidation` event not separately seeded
- Full visual Form Layout Builder deferred
- Script management UI is basic (no visual rule builder)
- `setReadOnly`/`computeTemplateValue` not demonstrated in demo script
- Script events limited to form (not list, not dashboard)
- No script debugging/error logging UI
