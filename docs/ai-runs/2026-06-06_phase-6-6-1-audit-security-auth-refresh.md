# Phase 6.6.1: Audit Security and Auth Refresh Fix

**Date:** 2026-06-06
**Commit:** TBD (pending push)
**Status:** COMPLETE

## Problem

Phase 6.6 added audit/version timeline, but had two security gaps:

1. **Audit/version RPCs leaked level-1 field data** - The read RPCs (`erp_list_document_audit_events`, `erp_list_document_versions`, `erp_get_document_version_diff`) returned full data without backend permlevel masking. Frontend masking alone is insufficient.

2. **Audit/version RPCs lacked record-level permission checks** - A restricted user with read access to a doctype could read audit/version data for ANY document of that doctype, not just documents they have permission rules for.

3. **Login required manual refresh** - After `signInWithPassword`, `onAuthStateChange` fired but `lastLoadedUserIdRef` was never set because the `useEffect` closure captured `session` as `null` at mount time (stale closure bug).

## Solution

### Migration 0050: Audit RPC Security Hardening

Created `supabase/migrations/0050_audit_rpc_security_auth_followup.sql`:

- **`erp_mask_audit_changes()`** - New helper function that masks audit log `changes` based on user's max_read permlevel. For 'create' actions, filters the nested `data` sub-object. For 'update' actions, filters the `diff` entries.

- **`erp_list_document_audit_events`** - Now enforces `document_matches_user_permission_rules` for record-level access AND applies `erp_mask_audit_changes` to mask level-1 fields.

- **`erp_list_document_versions`** - Now enforces `document_matches_user_permission_rules` for record-level access AND applies `filter_document_data_by_user_access` to mask level-1 fields in version data.

- **`erp_get_document_version_diff`** - Now enforces `document_matches_user_permission_rules` for record-level access AND applies `filter_document_data_by_user_access` to mask both `data_from` and `data_to` before computing diff.

### AuthContext Stale Closure Fix

Modified `src/context/AuthContext.tsx`:

- Added `tenantsCountRef` to track tenant count across effect closures (replaces stale `tenants.length` references).
- Changed `lastLoadedUserIdRef.current = session?.user?.id` to use `supabase.auth.getUser()` directly instead of relying on stale `session` closure.
- Updated all skip checks in `onAuthStateChange` to use `tenantsCountRef.current` instead of `tenants.length`.

## Verification

### Cloud Verification (33/33 PASS)
- Schema checks: `erp_mask_audit_changes` exists, all 3 RPCs use masking and record permission checks
- Admin: full access to audit events, versions, diffs (including level-1 fields)
- Low-privilege: level-1 fields (email, phone, notes) masked in audit events, versions, diffs, data_from, data_to

### Auth Refresh Verification (15/15 PASS)
- SIGNED_IN event fires after signInWithPassword
- Session available immediately after sign-in
- RPCs work after sign-in without refresh
- Sign out clears session
- Re-sign in produces fresh session

### Pipeline
- Typecheck: 0 errors
- Lint: 0 errors (54 pre-existing warnings)
- Test: 77/77 pass
- Build: PASS
