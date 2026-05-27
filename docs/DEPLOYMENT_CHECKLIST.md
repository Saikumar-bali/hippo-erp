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

## Simulation

- Command: `npm run test:simulation`
- SQL file: `tests/simulations/full_inventory_flow.sql`
- This command prints safe cloud execution instructions when no direct DB execution context is configured.
