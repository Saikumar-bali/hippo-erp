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
- [ ] Create `docs/PHASE_6_0_1_ACCESS_CONTROL_VERIFICATION.md`
- [ ] Create `docs/ai-runs/2026-06-03_phase-6-0-1-access-control-verification.md`
- [ ] Update `progress.md`

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

- [ ] Work must be committed and pushed to `phase-2.5-metadata-engine`.
- [ ] If local branch is `main` while tracking `origin/phase-2.5-metadata-engine`, document this clearly and avoid accidental pushes to wrong branch.

---

## C. Supabase Cloud migration smoke test

Verify migration 0042 on Supabase Cloud.

Smoke test these RPCs manually or with a script:

- [ ] `public.normalize_access_action_key`
- [ ] `public.default_access_permission_key`
- [ ] `public.get_access_control_targets`
- [ ] `public.get_access_control_matrix`
- [ ] `public.get_company_user_role_assignments`
- [ ] `public.set_company_user_roles`
- [ ] `public.save_access_control_matrix`
- [ ] `public.get_company_users`
- [ ] `public.current_user_has_doctype_permission`

Document exact PASS/FAIL results.

---

## D. Fix authenticated browser verification

Fix or clearly diagnose why Playwright login does not leave `/login`.

Tasks:

- [ ] Verify test credentials / seeded auth user exist.
- [ ] Verify login form selectors are correct.
- [ ] Verify Supabase env values are loaded in local Vite.
- [ ] Capture login error text if login fails.
- [ ] Update `scripts/verify_phase6_access_control.mjs` to fail with useful diagnostics.

Then run browser flow:

- [ ] open Access Control Manager
- [ ] select company
- [ ] create or select test role
- [ ] grant CRM Lead read/create/update
- [ ] assign role to test user or document why user switch is not practical
- [ ] show effective rights
- [ ] remove one right and verify missing-access diagnostic
- [ ] restore right

---

## E. Wire user role assignment page

Make the multi-role assignment page reachable in normal app flow.

Tasks:

- [ ] Add route if missing
- [ ] Add sidebar/menu item or Access Control Manager tab/link
- [ ] Ensure legacy Users/Roles flow still works
- [ ] Document final navigation path

---

## F. Test failure triage

Run:

```bash
npm run test
```

Triage the 5 failing tests:

- [ ] dashboard-kpi
- [ ] auth-routes
- [ ] auth-state
- [ ] permission-gates
- [ ] app

For each:

- [ ] classify as caused by Phase 6 or pre-existing
- [ ] fix if Phase 6 caused it
- [ ] document exact reason if left failing

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

- [ ] Branch state is clear and safe
- [ ] Migration 0042 RPC smoke test passes
- [ ] Browser verification either passes or exact blocking issue is fixed/documented with evidence
- [ ] User role assignment page is reachable
- [ ] Test failures are triaged and Phase-6-caused failures are fixed
- [ ] AI run report exists

After this, choose Phase 6.1 Company Branding / Theme Studio only if access control verification is clean.
