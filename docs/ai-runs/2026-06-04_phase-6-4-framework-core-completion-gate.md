# AI Run: 2026-06-04 Phase 6.4 Framework Core Completion Gate

## Scope

Finish the framework hardening gate before any new module work:

- access-control ambiguity fix
- real low-privilege verification
- breadcrumb foundation
- permission UX cleanup
- truthful project tracking

## Key Findings

1. The ambiguous-role failure was real and reproducible in Supabase Cloud.
   Exact failing function: `public.save_company_role(jsonb)`

2. The previous browser verification blocker was environmental, not architectural.
   The stored Playwright admin password was stale, and the verifier itself needed a few selector/save-wait fixes.

3. The repeated browser `404` errors were caused by a missing `public.get_company_theme(...)` runtime function on the cloud project, not by the new access-control work.

## Work Completed

- Added `supabase/migrations/0046_access_control_ambiguity_fix.sql`
- Applied the ambiguity fix to Supabase Cloud
- Added breadcrumb utilities and app-shell breadcrumb rendering
- Updated access-denied flows to show actionable guidance and collapsible technical details
- Added secure `scripts/provision_test_users.mjs`
- Hardened `scripts/verify_phase6_access_control.mjs`
- Added `public/favicon.svg` and linked it from `index.html`
- Applied the missing runtime theme function migration pieces on Supabase Cloud
- Updated `tasks.md` and `progress.md` truthfully

## Env Var Names Used

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLAYWRIGHT_TEST_EMAIL`
- `PLAYWRIGHT_TEST_PASSWORD`
- `PLAYWRIGHT_LOW_PRIV_EMAIL`
- `PLAYWRIGHT_LOW_PRIV_PASSWORD`
- `PLAYWRIGHT_BASE_URL`
- `PLAYWRIGHT_HEADLESS`

## Browser Commands

```bash
node scripts/provision_test_users.mjs
node scripts/verify_phase6_access_control.mjs
```

## Browser Artifact Path

- `C:/tmp/phase-6-4-framework-core/results.json`
- `C:/tmp/phase-6-4-framework-core/01-role-configured.png`
- `C:/tmp/phase-6-4-framework-core/02-role-assigned.png`
- `C:/tmp/phase-6-4-framework-core/03-low-priv-readonly.png`
- `C:/tmp/phase-6-4-framework-core/04-read-revoked.png`
- `C:/tmp/phase-6-4-framework-core/05-read-revoked-low-priv.png`

## PASS / FAIL

| Check | Result |
| --- | --- |
| Access-control ambiguity fix reproduced | PASS |
| Access-control ambiguity fix applied | PASS |
| Provisioning script works with env vars only | PASS |
| CRM Lead visible for low-priv user after readonly grant | PASS |
| Write/export/import/print actions blocked for low-priv user | PASS |
| Forbidden sidebar pages hidden | PASS |
| Revoked read removes or denies CRM Lead access | PASS |
| No page errors during final verifier run | PASS |

## Command Results

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS with 50 warnings, 0 errors |
| `npm run test` | PASS, 17 files / 72 tests |
| `npm run build` | PASS |
| `npm run test:simulation` | PASS |

## Notes

- The cloud project did not have the full Phase 6.1 theme migration applied, so the runtime portion was applied separately as `0043_company_branding_theme_runtime_fix`.
- Module Builder work remains outside this gate and was not started in this branch closeout.
