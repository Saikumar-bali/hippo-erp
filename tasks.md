# Phase 6.0.1 Tasks: Access Control Verification + Stabilization

Active branch: `phase-2.5-metadata-engine`

Goal: correct and verify Phase 6 access control before moving to any new platform feature.

## Current decision

Phase 6.0 implementation is mostly done, but verification is incomplete.

Do not start:

- Company Branding / Theme Studio
- Purchase Orders
- Print Format Builder
- Client Scripts
- Report Builder

## Why this phase exists

The last commits added useful Access Control Manager code, but there are still problems:

- Phase 6 was marked complete while authenticated browser verification was blocked.
- The report says login did not leave `/login` during Playwright verification.
- `npm run test` still has 5 failures in auth/dashboard/permission-gate/app areas.
- `UserRoleAssignmentPage` exists but is not yet wired as a normal user-facing route.
- Migration 0042 had at least one compatibility issue fixed later, so the full migration needs a clean smoke test.
- User terminal showed `HEAD -> main, origin/phase-2.5-metadata-engine`, so branch state must be verified before more pushes.

---

## A. Review docs

- [x] Add GPT review: `docs/ai-runs/2026-06-03_gpt-review-phase-6-access-control-last-commits.md`
- [x] Create `docs/PHASE_6_0_1_ACCESS_CONTROL_VERIFICATION.md`
- [x] Create `docs/ai-runs/2026-06-03_phase-6-0-1-access-control-verification.md`
- [x] Update `progress.md`

---

## B. Branch safety check

CLI-AI must first verify branch state:

```bash
git branch --show-current
git status
git log -1 --oneline
git remote -v
```

Required:

- [x] Work must be committed and pushed to `phase-2.5-metadata-engine`.
- [x] If local branch is `main` while tracking `origin/phase-2.5-metadata-engine`, document this clearly and avoid accidental pushes to wrong branch.

---

## C. Supabase Cloud migration smoke test

Verify migration 0042 on Supabase Cloud.

Smoke test these RPCs manually or with a script:

- [x] `public.normalize_access_action_key`
- [x] `public.default_access_permission_key`
- [x] `public.get_access_control_targets`
- [x] `public.get_access_control_matrix`
- [x] `public.get_company_user_role_assignments`
- [x] `public.set_company_user_roles`
- [x] `public.save_access_control_matrix`
- [x] `public.get_company_users`
- [x] `public.current_user_has_doctype_permission`

Document exact PASS/FAIL results.

---

## D. Fix authenticated browser verification

Fix or clearly diagnose why Playwright login does not leave `/login`.

Tasks:

- [x] Verify test credentials / seeded auth user exist.
- [x] Verify login form selectors are correct.
- [x] Verify Supabase env values are loaded in local Vite.
- [x] Capture login error text if login fails.
- [x] Update `scripts/verify_phase6_access_control.mjs` to fail with useful diagnostics.

Then run browser flow:

- [x] open Access Control Manager
- [x] select company
- [x] create or select test role
- [x] grant CRM Lead read/create/update
- [x] assign role to test user or document why user switch is not practical
- [x] show effective rights
- [ ] remove one right and verify missing-access diagnostic
- [x] restore right

---

## E. Wire user role assignment page

Make the multi-role assignment page reachable in normal app flow.

Tasks:

- [x] Add route if missing
- [x] Add sidebar/menu item or Access Control Manager tab/link
- [x] Ensure legacy Users/Roles flow still works
- [x] Document final navigation path

---

## F. Test failure triage

Run:

```bash
npm run test
```

Triage the 5 failing tests:

- [x] dashboard-kpi
- [x] auth-routes
- [x] auth-state
- [x] permission-gates
- [x] app

For each:

- [x] classify as caused by Phase 6 or pre-existing
- [x] fix if Phase 6 caused it
- [x] document exact reason if left failing

---

## G. Commands

Run and document:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

---

## H. Acceptance

Phase 6.0.1 is complete only when:

- [x] Branch state is clear and safe
- [x] Migration 0042 RPC smoke test passes
- [x] Browser verification either passes or exact blocking issue is fixed/documented with evidence
- [x] User role assignment page is reachable
- [x] Test failures are triaged and Phase-6-caused failures are fixed
- [x] AI run report exists

After this, choose Phase 6.1 Company Branding / Theme Studio only if access control verification is clean.
