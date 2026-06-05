# Phase 6.6 Tasks: Audit Trail and Version Timeline Foundation

Status: COMPLETE.

Phase 6.5 accepted from commit `9932af891d21e2a3f5182ea974db618909a480a1`.

Goal: add company-scoped audit history and version timeline support for metadata-driven generic_json DocTypes. CRM Lead is the proof target.

## Tasks

- [x] Create migration 0049 for audit/version foundation
- [x] Record create, update, and deactivate events in erp_audit_logs
- [x] Add RPCs: erp_list_document_audit_events, erp_list_document_versions, erp_get_document_version_diff
- [x] Add frontend API methods: listAuditEvents, listVersions, getVersionDiff
- [x] Add audit/version timeline UI to DynamicDetailPage
- [x] Level-1 field values masked in audit diffs for restricted users
- [x] Apply migration 0049 to Supabase Cloud
- [x] Create cloud verification script (22/22 PASS)
- [x] Create browser verification script
- [x] Run full pipeline: typecheck, lint, test, build
- [x] Run cloud verification (22/22 PASS)
- [x] Fix jsonb_object_keys bug in erp_update_document
- [x] Update docs and push
