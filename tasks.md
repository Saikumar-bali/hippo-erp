# Phase 6.4 Tasks: Framework Core Completion Gate

Active branch: `phase-2.5-metadata-engine`

Goal: stop adding feature layers and harden the framework foundation so access control, navigation, and diagnostics behave closer to Frappe-level quality.

Do not start Fleet Management, Module Builder, Purchase Orders, Client Scripts, Report Builder, Workflow, or PDF generation from this task file.

## Current status

Phase 6.4 is complete:

- [x] Reproduced the `42702` ambiguous `id` error on role permission removal
- [x] Identified the exact failing RPC path in `save_company_role(jsonb)`
- [x] Added `supabase/migrations/0046_access_control_ambiguity_fix.sql`
- [x] Applied the ambiguity fix on Supabase Cloud and re-tested the update path
- [x] Added breadcrumb foundation in app shell
- [x] Cleaned permission UX to show actionable access guidance with collapsible technical details
- [x] Added local provisioning helper `scripts/provision_test_users.mjs` using env vars only
- [x] Completed real low-privilege Playwright verification for CRM Lead access restrictions
- [x] Updated `progress.md`
- [x] Created `docs/PHASE_6_4_FRAMEWORK_CORE_COMPLETION_GATE.md`
- [x] Created `docs/ai-runs/2026-06-04_phase-6-4-framework-core-completion-gate.md`

## A. Database + Access Control

- [x] Reproduce ambiguous-role update failure
- [x] Fix `save_company_role(jsonb)` with fully qualified aliases
- [x] Qualify related delete path for consistency
- [x] Smoke test add permission / remove permission / save / reload without `42702`

## B. Provisioning + Verification

- [x] Add `scripts/provision_test_users.mjs`
- [x] Use environment variables only
- [x] Provision or reuse low-privilege test user
- [x] Add low-privilege user to selected company through existing invite/accept flow
- [x] Real Playwright verification:
  - [x] admin login
  - [x] create readonly role
  - [x] grant only `view_crm_lead`
  - [x] assign role to low-privilege user
  - [x] verify CRM Lead visible
  - [x] verify Create hidden
  - [x] verify Update/Delete/Export/Import/Print hidden
  - [x] verify forbidden sidebar entries hidden
  - [x] revoke `view_crm_lead`
  - [x] verify CRM Lead hidden or access denied

## C. Navigation + UX

- [x] Create `src/components/layout/BreadcrumbBar.tsx`
- [x] Create `src/lib/navigation/breadcrumbs.ts`
- [x] Show breadcrumb trail in app shell
- [x] Keep breadcrumb navigation clickable
- [x] Keep sidebar active state aligned with route
- [x] Replace raw permission JSON with user-safe access guidance

## D. Validation

- [x] `node scripts/provision_test_users.mjs`
- [x] `node scripts/verify_phase6_access_control.mjs`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run test:simulation`

## Acceptance

Phase 6.4 is complete only when:

- [x] ambiguous access-control update is fixed
- [x] role permission add/remove works
- [x] low-privilege login is tested
- [x] sidebar and action restrictions are proven in browser
- [x] breadcrumb navigation works
- [x] tasks/progress are truthful
- [x] no credentials are committed
- [x] Playwright evidence exists
- [x] command results are documented
