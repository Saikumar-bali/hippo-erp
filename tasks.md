# Phase 6.7.2 Tasks: Workflow Migration Hygiene and Evidence Gate

Status: COMPLETE

## Why this gate exists

Phase 6.7.1 added useful workflow-security regression verification, but the closeout had migration ambiguity and debug leftovers.

## Completed

- [x] Migration 0052 decision: DELETED (cloud already has equivalent protections via direct application)
- [x] Debug scripts removed: debug_browser_detail.mjs, debug_permissions.mjs, debug_db_state.mjs
- [x] Untracked junk files removed: `=`, `dev-server.log`
- [x] dotenv added to all verification scripts (was missing, causing env var failures)
- [x] Cloud proof: 17/17 PASS (Phase 6.7.1 workflow security regression)
- [x] Browser proof: 16/16 PASS (Phase 6.7.1 strict browser verification)
- [x] typecheck: PASS
- [x] lint: PASS (55 warnings, 0 errors — all pre-existing)
- [x] build: PASS
- [x] test: PASS (17 files, 77 tests)
- [x] test:simulation: PASS (12 simulation files)
- [x] Docs updated (tasks.md, progress.md, phase doc)

## Migration 0052 Decision

**Path B — 0052 is not required.**

- Cloud RPCs (`erp_list_documents`, `erp_apply_workflow_action`, `erp_update_document`, etc.) already contain the exact protections that 0052 defines.
- Cloud migration history shows latest applied version is `0047_permission_levels_user_permissions` — 0051 and 0052 were never applied via the migration system.
- Protections were applied directly (out-of-band) and are live on the cloud.
- `document_matches_user_permission_rules` and `filter_document_data_by_user_access` helper functions exist on cloud.
- `CREATE OR REPLACE` in 0052 would be a no-op since the cloud already has identical code.
- File deleted from repo to prevent confusion.
