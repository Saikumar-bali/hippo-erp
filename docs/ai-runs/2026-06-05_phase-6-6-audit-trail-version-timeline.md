# Phase 6.6: Audit Trail and Version Timeline Foundation — AI Run Report

**Date:** 2026-06-05
**Branch:** phase-2.5-metadata-engine
**Starting commit:** Phase 6.5 accepted from `9932af891d21e2a3f5182ea974db618909a480a1`

## Summary

Implemented company-scoped audit trail and version timeline support for metadata-driven generic_json DocTypes. CRM Lead is the proof target. All 22 cloud verification checks pass.

## What Was Done

### Migration 0049 (`supabase/migrations/0049_audit_trail_version_timeline.sql`)

Replaced 4 existing RPCs with audit-logging versions:
- `erp_create_document` — writes `create` event to `erp_audit_logs`
- `erp_update_document` — writes `update` event with field-level diff to `erp_audit_logs`
- `erp_deactivate_document` — writes `deactivate` event to `erp_audit_logs`
- `erp_reactivate_document` — writes `reactivate` event to `erp_audit_logs`

Added 3 new query RPCs:
- `erp_list_document_audit_events(doctype_key, document_id, company_id)` — returns audit events for a document
- `erp_list_document_versions(doctype_key, document_id, company_id)` — returns version history
- `erp_get_document_version_diff(doctype_key, document_id, company_id, version_from, version_to)` — returns diff between two versions

### Frontend API (`src/lib/metadata/generic-doctype-api.ts`)

Added 3 new methods to `createGenericDocTypeApi()`:
- `listAuditEvents(id, tenantId?)` — calls `erp_list_document_audit_events`
- `listVersions(id, tenantId?)` — calls `erp_list_document_versions`
- `getVersionDiff(id, versionFrom, versionTo, tenantId?)` — calls `erp_get_document_version_diff`

Updated `DocTypeApi` interface in `src/components/metadata/doctype-api-map.ts` with optional signatures.

### UI (`src/components/metadata/DynamicDetailPage.tsx`)

Added collapsible "Audit & Version Timeline" section:
- **Activity Log** — shows create/update/deactivate/reactivate events with timestamps and changed field names
- **Version History** — shows version numbers with diff buttons
- **Version Diff View** — shows old→new values for changed fields
- **Permission masking** — fields with `permlevel > 0` show `•••` instead of actual values

### Bug Fix

Fixed `jsonb_object_keys(v_diff) is not null` in `erp_update_document` → replaced with `v_diff != '{}'::jsonb`. The original used a set-returning function in a boolean context, causing "query returned more than one row" when updating 2+ fields simultaneously.

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/0049_audit_trail_version_timeline.sql` | Migration: audit logging + query RPCs |
| `scripts/verify_phase6_6_audit_cloud.mjs` | Cloud verification (22 checks) |
| `scripts/verify_phase6_6_audit_timeline.mjs` | Browser verification script |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/metadata/generic-doctype-api.ts` | Added `listAuditEvents`, `listVersions`, `getVersionDiff` |
| `src/components/metadata/doctype-api-map.ts` | Updated `DocTypeApi` interface |
| `src/components/metadata/DynamicDetailPage.tsx` | Added audit/version timeline UI |
| `tasks.md` | Completed Phase 6.6 checklist |
| `progress.md` | Marked Phase 6.6 complete |

## Verification Results

| Check | Result |
|-------|--------|
| Cloud verification | 22/22 PASS |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 54 warnings (pre-existing) |
| `npm run test` | 72/72 pass |
| `npm run build` | PASS |

## Key Decisions

- Audit logs stored in existing `app.erp_audit_logs` table (no new table needed)
- Version snapshots continue using existing `app.erp_document_versions` table
- Permission masking in UI uses `permlevelByFieldname` from `useDocTypeFieldAccess` hook
- Audit section only shown for generic_json documents with existing events
- Level-1 field values masked as `•••` in diff view for restricted users
