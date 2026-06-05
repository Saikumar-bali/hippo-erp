# AI Run: 2026-06-05 Phase 6.5 Permission Levels and User Permissions

Status: COMPLETE

## Scope

Complete Phase 6.5:

- permission levels on metadata DocFields
- role-level field access controls
- record-level user permission rules
- CRM Lead proof target
- cloud verification proving Supabase Cloud has the fixed SQL

## Work completed

### Database

- Created migration `0047_permission_levels_user_permissions.sql`
- Applied migration 0047 on Supabase Cloud (version `20260605063738`)
- Discovered SQL bug in `save_company_user_permission`: `ON CONFLICT` clause had ambiguous column references
- Created migration `0048_fix_save_company_user_permission.sql` (idempotent fix for fresh installs)
- Applied fix to Supabase Cloud via Management API (`https://api.supabase.com/v1/projects/{ref}/database/query`)

### Frontend

- Added `permlevel` support to metadata types and Field Builder
- Added frontend field-access filtering to dynamic metadata pages
- Added field-level permissions UI to Access Control Manager
- Added user-permissions UI to User Role Assignment
- Removed debug console.logs from AccessControlManagerPage

### Verification Scripts

- Created `scripts/verify_phase6_5_cloud.mjs` — direct Supabase Cloud checks (20 tests)
- Updated `scripts/verify_phase6_5_permission_levels.mjs` — browser Playwright verification (18 tests)

## Verification Results

### Cloud Verification: 20/20 PASS

All schema checks and RPC checks passed against Supabase Cloud:
- `erp_docfields.permlevel` exists
- CRM Lead has level 0 (6 fields) and level 1 (3 fields: email, notes, phone)
- `company_user_permissions` table exists with 13 columns
- `save_company_user_permission` uses `unique_violation` upsert (no ON CONFLICT ambiguity)
- User permission rule insert/update/upsert all work
- Row-level filtering: allowed lead visible, blocked lead hidden
- Level 1 fields hidden from list response
- CRM Opportunity CRUD works

### Browser Verification: 18/18 PASS

All Playwright browser checks passed:
- Admin login, lead creation, role creation, permission configuration
- Low-priv user sees only allowed records (row-level filtering)
- Level 1 fields hidden in list and detail views
- CRUD buttons properly restricted

### Pipeline: All PASS

| Command | Result |
|---------|--------|
| typecheck | 0 errors |
| lint | 53 warnings (pre-existing) |
| test | 72/72 |
| build | success |
| simulation | success |
| provision | success |

## Artifacts

- Cloud verification: `C:/tmp/phase-6-5-permission-levels/cloud-verification-results.json`
- Browser results: `C:/tmp/phase-6-5-permission-levels/results.json`
- Screenshots: `C:/tmp/phase-6-5-permission-levels/01-` through `04-`

## Final Commit

- Branch: `phase-2.5-metadata-engine`
- Commit: will be created after docs update
