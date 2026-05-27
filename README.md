# Hippo ERP (Frontend + Supabase)

## Overview
Inventory ERP implemented with React + Vite + TypeScript frontend and Supabase backend (Auth + Postgres + RLS + RPC).

## Environment
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Local setup
1. `npm install`
2. `npx supabase init` (already initialized in this workspace)
3. `npx supabase start` (requires Docker)
4. Apply migrations from `supabase/migrations`.
5. Seed using `supabase/seed.sql`.

## Security notes
- Frontend uses only publishable key.
- Service role key is not used in frontend code.
- RLS enabled on `app` and `wh` tables.

## Tests
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

## Cloudflare Pages deployment
- Deploy the frontend only; Supabase is the backend.
- Build command: `npm run build`
- Output directory: `dist`
- Required environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Do not configure Supabase service role keys, database passwords, or other private backend secrets in Cloudflare Pages.

## Known limitations
- Supabase local stack and SQL test execution depend on Docker/CLI availability in host environment.
- Auth user seeding is manual unless local auth setup is scripted.
