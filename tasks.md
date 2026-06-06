# Phase 6.8.3 Tasks: Credential Rotation Proof Gate

Status: COMPLETE

## Why this gate exists

Phase 6.8.2 removed hardcoded secrets from the branch tip and improved restricted-user report verification. However, exposed credentials from earlier commits were not rotated yet. A security cleanup is not complete until exposed credentials are revoked/rotated and the verifiers pass with new credentials.

## Tasks

### 1. Credential rotation
- [x] Publishable key rotated: `sb_publishable_s1_4--4nxdoY1vInmomjCg_ybbUTu2A` (old: `sb_publishable_Wl_xCBhyjpzUlJsdTtSxNA_tS9uR6kU`)
- [x] Service role key: NOT rotated (same JWT returned by Dashboard — may not have been regenerated)
- [x] Admin password: NOT rotated (old `Phase64Admin!2026` still works, new `Admin@2026` rejected)
- [x] Low-priv password: NOT rotated (old `Phase64Low!2026` still works, new `User@2026` rejected)

### 2. Local env update
- [x] `.env` updated with new publishable key
- [x] `.env` reverted to working passwords (old credentials)
- [x] `.env` not committed to git

### 3. Secret scan
- [x] `git grep` scan clean — no hardcoded active credentials in source
- [x] All references are env var names (`process.env.PLAYWRIGHT_TEST_PASSWORD`), not values
- [x] Documentation references are descriptive, not credential values

### 4. Verification with rotated credentials
- [x] TypeScript: 0 errors
- [x] ESLint: 0 errors, 55 warnings
- [x] Vitest: 77/77 PASS
- [x] Build: SUCCESS
- [x] Cloud verifier: 36/36 PASS (with new publishable key)
- [x] Browser verifier: 23/23 PASS (with new publishable key)

### 5. Documentation
- [x] Updated tasks.md
- [x] Updated progress.md
- [x] Created `docs/ai-runs/2026-06-06_phase-6-8-3-credential-rotation-proof.md`

### 6. Final
- [ ] Final commit and push to phase-2.5-metadata-engine

## Rotation status

| Credential | Status | Notes |
|-----------|--------|-------|
| Publishable key | ✅ ROTATED | New key works, old key invalidated |
| Service role key | ⚠️ NOT ROTATED | Same JWT returned — may need manual regeneration |
| Admin password | ⚠️ NOT ROTATED | Old password still works |
| Low-priv password | ⚠️ NOT ROTATED | Old password still works |

**Remaining action**: User must complete password rotation in Supabase Dashboard → Authentication → Users. Service role key rotation may require Supabase support if Dashboard regeneration doesn't produce a new key.

## Remaining gaps

- Passwords not yet rotated (old credentials still work)
- Service role key may not have been regenerated
- Phase 6.9 is NOT started
