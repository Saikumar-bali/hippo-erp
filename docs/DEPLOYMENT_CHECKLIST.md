# Deployment Checklist

## Supabase Cloud URL Settings

Project: `bhqgszzvemejfbgndtnf`

- Site URL: `https://hippo-erp.pages.dev`
- Redirect URLs:
  - `https://hippo-erp.pages.dev/auth/callback`
  - `https://hippo-erp.pages.dev/**`
  - `https://*.hippo-erp.pages.dev/**`
  - `http://localhost:5173/auth/callback`
  - `http://localhost:5173/**`
  - `http://127.0.0.1:5173/**`

## Cloudflare Pages GitHub Auto-Deploy

Project: `hippo-erp`

- Source: GitHub repo `Saikumar-bali/hippo-erp`
- Production branch: `main`
- Build command: `npm run build`
- Output dir: `dist`
- Production env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `NODE_VERSION=22`

## Auth URL Expectations

- Local callback: `http://localhost:5173/auth/callback`
- Production callback: `https://hippo-erp.pages.dev/auth/callback`
- User-facing terminology: use **Company** in ERP UI/copy.
- Scope note: company onboarding and invite acceptance are platform-owned and verified outside this ERP module checklist.

## Simulation

- Command: `npm run test:simulation`
- SQL file: `tests/simulations/full_inventory_flow.sql`
- This command prints safe cloud execution instructions when no direct DB execution context is configured.

## Verification Log (2026-05-27)

- Cloudflare Pages project `hippo-erp` is connected to GitHub source `Saikumar-bali/hippo-erp` on production branch `main`.
- Production env vars confirmed in Cloudflare Pages config:
  - `VITE_SUPABASE_URL=https://bhqgszzvemejfbgndtnf.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` is set
  - `NODE_VERSION=22`
- Git push to `main` completed for commit `593a5ff`.
- Cloudflare created a new deployment with trigger type `github:push` and commit hash `593a5ffe5e739fd036d8b061ced5fb9433ae656b`.
- Runtime availability check passed: `curl -I https://hippo-erp.pages.dev/login` returned `HTTP/1.1 200 OK`.
- `npm run test:simulation` executed and returned safe cloud SQL execution instructions.

## Verification Log (2026-05-28)

- UI screenshots captured from production login page:
  - Desktop: `artifacts/screenshots/login-desktop.png`
  - Mobile: `artifacts/screenshots/login-mobile.png`
- Production UI smoke run results:
  - `/login` loaded.
  - `/signup` opened.
  - `/reset` opened.
  - Reset submit returned success copy: "Email Password reset email sent."
- Supabase redirect allow-list probe executed using `resetPasswordForEmail` with all required targets and all were accepted (`error: null`):
  - `https://hippo-erp.pages.dev/auth/callback`
  - `https://hippo-erp.pages.dev/**` pattern behavior verified with deep path
  - `https://*.hippo-erp.pages.dev/**` pattern behavior verified with preview-style subdomain
  - `http://localhost:5173/auth/callback`
  - `http://localhost:5173/**` pattern behavior verified with deep path
  - `http://127.0.0.1:5173/**` pattern behavior verified with deep path
- Supabase auth logs show corresponding `/recover` requests with accepted referers for localhost, `127.0.0.1`, and production-style pages host paths.
