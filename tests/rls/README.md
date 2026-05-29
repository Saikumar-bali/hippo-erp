# Company-Scoped RLS Tests

## Overview

All `wh.*` tables enforce company-scoped RLS through dynamic policies applied by `private.apply_wh_policies()`. Every table has:

- **SELECT**: `app.current_user_is_tenant_member(tenant_id)` — any active member of the company can read.
- **INSERT/UPDATE**: `app.current_user_has_tenant_role(tenant_id, array['owner','admin','warehouse_manager','stock_operator'])` — only operational roles can modify data.
- **DELETE**: `app.current_user_has_tenant_role(tenant_id, array['owner','admin','warehouse_manager'])` — only senior roles can delete.

Stock-changing operations (GRN posting, stock transfer, adjustment approval, cycle count completion) are protected by RPC functions in the `wh` schema, which perform role checks before executing.

## Permission Enforcement Layers

1. **Frontend guards** (`PermissionGate`, `usePermissions`) — UX layer, blocks UI access.
2. **Supabase RLS** — row-level enforcement on all `wh.*` and `app.*` tables.
3. **RPC role checks** — `app.current_user_has_tenant_role()` inside each stock-changing RPC.

## Key Helper Functions

- `app.current_user_is_tenant_member(tenant_id)` — returns boolean
- `app.current_user_has_tenant_role(tenant_id, roles[])` — returns boolean
- `app.current_tenant_roles(tenant_id)` — returns text[]

## Existing RLS Test Files

- `01_anon_denied.sql` — verifies unauthenticated access is blocked
- `02_cross_tenant_denied.sql` — verifies company A cannot see company B data
- `03_role_permissions.sql` — verifies role-based access to permission tables
- `04_company_permissions.sql` — verifies company-scoped permission grants

## Running RLS Tests

Execute against your Supabase project via SQL Editor or:

```bash
# If using supabase CLI with local Docker:
npx supabase db test
```

## Company Context Rule

Every `wh.*` table has a `tenant_id` column (internal name for company context). RLS policies automatically filter by the current user's company membership. No query should bypass this by omitting tenant_id filters.

## Approval Workflow Permissions

See `docs/ARCHITECTURE.md` > Approval Permission Mapping for the full list of approval permissions and their future workflow mappings.
