# Phase 6.8.2 Tasks: Report Secrets Cleanup and Restricted-User Evidence Gate

Status: ACTIVE

## Why this gate exists

Phase 6.8.1 hardened Report Builder, but the committed verifier contains hardcoded Supabase credentials and the browser verification still only proves the admin UI path. Report Builder cannot be accepted until secrets are removed/rotated and restricted-user report security is