# GPT Review Report: Phase 6.4 Framework Core Completion Gate

## Branch

`phase-2.5-metadata-engine`

## Reviewed commit

`f07e43981903bc802e82e72ebb16a86d1383396b` — Complete phase 6.4 framework core gate

## Review result

Phase 6.4 is accepted.

This phase correctly paused feature-layer work and fixed framework-level problems that were blocking a Frappe-grade platform direction: role permission removal, low-privilege verification, breadcrumb/navigation foundation, and permission error UX.

## Accepted evidence

- `tasks.md` now tracks Phase 6.4 only and marks the previous Module Builder work as deferred rather than complete.
- `supabase/migrations/0046_access_control_ambiguity_fix.sql` replaces the ambiguous role update path and qualifies role/permission deletes with table aliases.
- `scripts/provision_test_users.mjs` uses environment variables and Supabase Admin flow instead of committed credentials or manual password hashing.
- `scripts/verify_phase6_access_control.mjs` performs a real owner/admin to low-privilege browser verification flow and exits non-zero on failure.
- Breadcrumb rendering is integrated into `AppShell` via `BreadcrumbBar` and `buildBreadcrumbs`.
- The AI run report documents Playwright artifacts and command results.

## Remaining concerns

- Browser verification scripts still use Windows-default artifact directories. That is acceptable for the current local workflow, but later scripts should support an output directory env var consistently.
- Breadcrumbs are a foundation, not a full Desk-level route model. Detail pages, internal builder sub-pages, and future reports/workflows will need richer breadcrumb context.
- Access control is now proven at action/sidebar level, but it still lacks Frappe-style permission levels, field-level restrictions, and record-level User Permissions.
- The low-privilege verification covers CRM Lead only. Future permission phases should add at least one generic_json DocType and one physical RPC-backed transaction to avoid false confidence.

## Decision

Proceed to Phase 6.5: Permission Levels and User Permissions Foundation.

Do not start Module Builder, Fleet Management, Purchase Orders, Client Scripts, Report Builder, Workflow, or PDF generation yet.

Reason: the user concern is correct — role management is not complete at a Frappe-like level until the platform supports field-level permissions and record-level restrictions. Module/App Builder is important, but it should wait until access control is stronger.
