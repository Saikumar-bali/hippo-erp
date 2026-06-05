# Phase 6.4 Framework Core Completion Gate

Branch: `phase-2.5-metadata-engine`

Report file name requested on 2026-06-04. Final verification completed on 2026-06-05 local time.

## Goal

Pause new feature layers and harden the framework foundation:

- fix ambiguous access-control updates
- prove low-privilege role behavior with real browser verification
- improve breadcrumb/navigation quality
- improve permission error UX

## What Changed

### 1. Access-control database fix

- Reproduced the exact failure: `ERROR: 42702: column reference "id" is ambiguous`
- Confirmed the failing RPC path was `public.save_company_role(jsonb)` during role update
- Added `supabase/migrations/0046_access_control_ambiguity_fix.sql`
- Qualified the update/delete paths with table aliases
- Applied the fix on Supabase Cloud and re-ran the failing update path successfully

### 2. Breadcrumb foundation

Added:

- `src/lib/navigation/breadcrumbs.ts`
- `src/components/layout/BreadcrumbBar.tsx`

Integrated breadcrumb rendering into the app shell so routes now surface clearer context such as:

- `Home / CRM / Leads`
- `Home / Metadata Studio / Metadata Studio Access Control Manager`
- `Home / Company Admin / Users and Roles Access Assignments`

### 3. Permission UX cleanup

Updated access-denied flows so users see:

- `Access required: <permission_key>`
- `Fix: Open Access Control Manager and grant this right to one of the user's active roles.`

Raw technical error details remain available in a collapsible section for developers.

### 4. Secure test-user provisioning

Added `scripts/provision_test_users.mjs`.

The script now:

- uses auth admin only to ensure the low-privilege auth user exists
- signs in with the admin Playwright account
- creates or refreshes a company invite for the low-privilege user
- signs in as the low-privilege user and accepts the invite

Required env var names:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLAYWRIGHT_TEST_EMAIL`
- `PLAYWRIGHT_TEST_PASSWORD`
- `PLAYWRIGHT_LOW_PRIV_EMAIL`
- `PLAYWRIGHT_LOW_PRIV_PASSWORD`

### 5. Playwright verification hardening

Updated `scripts/verify_phase6_access_control.mjs` to:

- wait for async save flows to complete
- use stable selectors that match the real CRM Lead page
- capture screenshots and `results.json`
- exit non-zero on failure

## Browser Verification

Provisioning command:

```bash
node scripts/provision_test_users.mjs
```

Playwright command:

```bash
node scripts/verify_phase6_access_control.mjs
```

Artifact path:

- `C:/tmp/phase-6-4-framework-core`

Artifacts:

- `results.json`
- `01-role-configured.png`
- `02-role-assigned.png`
- `03-low-priv-readonly.png`
- `04-read-revoked.png`
- `05-read-revoked-low-priv.png`

Verification results:

| Check | Result |
| --- | --- |
| CRM Lead visible for low-privilege user after granting only `view_crm_lead` | PASS |
| Create hidden | PASS |
| Update hidden | PASS |
| Delete hidden | PASS |
| Export hidden | PASS |
| Import hidden | PASS |
| Print hidden | PASS |
| Forbidden sidebar items hidden | PASS |
| CRM Lead hidden or denied after revoking `view_crm_lead` | PASS |
| No page errors | PASS |

## Commands

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS with 50 warnings, 0 errors |
| `npm run test` | PASS, 17 files / 72 tests |
| `npm run build` | PASS |
| `npm run test:simulation` | PASS |

## Supabase Cloud Notes

Applied:

- `0046_access_control_ambiguity_fix`
- `0043_company_branding_theme_runtime_fix`

Why the runtime theme fix was needed:

- the current cloud project was missing `public.get_company_theme(...)`
- that caused repeated browser `404` noise during verification
- the runtime migration added the needed theme columns and functions without inventing new feature scope

## Remaining Gaps

- `npm run lint` still has 50 pre-existing warnings
- the full `0043_company_branding_theme.sql` workspace-item seed could not be applied to this cloud project because `company_admin` workspace metadata is absent there
