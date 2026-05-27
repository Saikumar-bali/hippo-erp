# Architecture

Hippo ERP is a frontend-only React + Vite application that uses Supabase as the entire backend.

- Frontend: React + TypeScript + Vite
- Auth: Supabase Auth
- Data: Supabase Postgres
- Authorization: Row Level Security (tenant scoped)
- Business logic: PostgreSQL RPC functions in `wh` schema

## Runtime Boundaries

- Frontend only uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Service role keys are never used in browser code.
- Stock-changing actions run through RPC, not direct mutable stock writes.

## Core Data Domains

- `app`: tenancy, profiles, memberships
- `wh`: warehouses, products, stock, movements, GRN, transfers, adjustments, cycle counts, reservations, valuation

## Deployment

- Production frontend: `https://hippo-erp.pages.dev`
- Supabase project: `bhqgszzvemejfbgndtnf`
- Cloudflare Pages uses GitHub source + `main` branch.
