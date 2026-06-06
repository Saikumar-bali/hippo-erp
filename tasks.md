# Phase 6.6.1 Tasks: Audit Security and Auth Refresh Fix

Status: COMPLETE

## Scope

Do not start Phase 6.7, Workflow, Report Builder, Client Scripts, Module Builder, Purchase Orders, Fleet, PDF, or any new business module.

## Required work

- [x] Create migration `0050_audit_rpc_security_auth_followup.sql` or equivalent if SQL changes are needed.
- [x] Harden `erp_list_document_audit_events`, `erp_list_document_versions`, and `erp_get_document_version_diff`.
- [x] Audit/version RPCs must enforce document read permission and active user-permission record filters.
- [x] Audit/version RPCs must mask or omit fields whose permlevel the current user cannot read.
- [x] Audit/version RPC responses must not leak level-1 data.
- [x] Fix login refresh bug (stale closure in AuthContext.tsx).
- [x] Cloud verification: 33/33 PASS.
- [x] Auth refresh verification: 15/15 PASS.
- [x] Pipeline: typecheck 0 errors, lint 0 errors, test 77/77, build PASS.
