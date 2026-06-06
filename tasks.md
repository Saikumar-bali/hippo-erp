# Phase 6.6.2 Tasks: Browser Auth Refresh Verification Gate

Status: ACTIVE

## Why this gate exists

Phase 6.6.1 fixed the AuthContext stale-closure issue and added an API-level auth refresh verifier. That is useful, but it does not prove the real user-facing bug is fixed.

The reported bug is browser/UI specific: after login, the app does not load until manual refresh.

Do not start Phase 6.7 until this browser gate passes.

## Scope

Do not start Workflow, Report Builder, Client Scripts, Module Builder, Purchase Orders, Fleet, PDF, or any new business module.

## Required work

- [ ] Create or update `scripts/verify_phase6_6_2_browser_auth_refresh.mjs`.
- [ ] Use Playwright or Chrome DevTools browser automation, not only Supabase JS API calls.
- [ ] Open the deployed/local app while logged out.
- [ ] Login as admin/owner through the real login form.
- [ ] Verify the app lands on the workspace/dashboard without manual page reload.
- [ ] Verify current company context is loaded after login.
- [ ] Verify permission/module data is loaded after login.
- [ ] Logout through the real UI.
- [ ] Login as restricted user through the real login form.
- [ ] Verify the restricted user lands on an allowed page without manual reload.
- [ ] Verify no false Access Denied state appears during session hydration.
- [ ] Verify no infinite loading state.
- [ ] Save browser screenshots and results JSON.
- [ ] Script must exit non-zero on failure.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run test:simulation`.
- [ ] Run `node scripts/verify_phase6_6_2_browser_auth_refresh.mjs`.
- [ ] Update `progress.md` and AI run docs only after browser proof passes.

## Definition of done

- [ ] Browser login no longer requires manual refresh.
- [ ] Admin browser login passes.
- [ ] Restricted browser login passes.
- [ ] Screenshots/results JSON path is documented.
- [ ] Final commit hash is documented.
- [ ] No credentials are committed.
