# Phase 6.6.1 Tasks: Audit Security and Auth Refresh Fix

Status: ACTIVE. Phase 6.6 is not accepted until this remediation passes.

Reason: Phase 6.6 added audit/version timeline, but audit/version RPCs must prove backend masking and record-level restrictions. UI-only masking is not enough. Also fix the login issue where users must refresh after sign-in.

## Scope

Do not start Phase 6.7, Workflow, Report Builder, Client Scripts, Module Builder, Purchase Orders, Fleet, PDF, or any new business module.

## Required work

- [ ] Create migration `0050_audit_rpc_security_auth_followup.sql` or equivalent if SQL changes are needed.
- [ ] Harden `erp_list_document_audit_events`, `erp_list_document_versions`, and `erp_get_document_version_diff`.
- [ ] Audit/version RPCs must enforce document read permission and active user-permission record filters.
- [ ] Audit/version RPCs must mask or omit fields whose permlevel the current user cannot read.
- [ ] Audit/version RPC responses must not leak level-1 data