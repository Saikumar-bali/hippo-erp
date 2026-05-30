# Node.js Metadata Service Design

## When To Add Node.js

A Node.js backend should be added when Supabase RPC alone cannot safely or practically handle:

- **Centralized metadata API** — serve metadata config with caching, aggregation, and permissions.
- **Document CRUD orchestration** — generic create/update/delete with field whitelisting, permission checks, audit logging.
- **Workflow transitions** — multi-step state machine transitions with side effects.
- **Plugin/module system** — runtime extensibility beyond seeded metadata.
- **Server-side validation engine** — complex cross-field or cross-document validation.
- **Complex permission conditions** — conditions beyond simple key matching.
- **Business services** — stock valuation, reorder generation, financial calculations.

## When NOT To Add Node.js

Do NOT add Node.js if:

- PostgreSQL RPC can do the job safely and practically.
- The only reason is "real backend" aesthetic preference.
- The frontend + Supabase combination already meets security and performance requirements.

## Suggested Structure

```
server/
  src/
    app.ts                          # Express/Fastify entry point
    auth/
      supabaseAuthMiddleware.ts     # Verify Supabase JWT, extract user context
    metadata/
      metadata.routes.ts            # GET /api/metadata/doctypes/:key
      metadata.service.ts           # Load/cache metadata from DB
    documents/
      document.routes.ts            # CRUD routes for generic documents
      document.service.ts           # Orchestrate read/write with validation
      document.validator.ts         # Field validation from metadata
    workflows/
      workflow.service.ts           # State machine transitions
    naming/
      naming.service.ts             # Naming series generation
    permissions/
      permission.service.ts         # Enforce DocType-level permissions
    db/
      supabaseAdmin.ts              # Service-role Supabase client (server only)
      postgres.ts                   # Direct pg connection if needed
    audit/
      audit.service.ts              # Audit log writes
```

## Security Rules for Node Backend

1. **Must verify Supabase JWT** on every request.
2. **Must never trust frontend `company_id` blindly.** Derive company context from the authenticated user's membership.
3. **May use service role only server-side.** Never expose service key to frontend.
4. **Must enforce permissions before any write.**
5. **Must whitelist fields before writing.**
6. **Must log all audit-relevant actions.**

## Current Decision

Do NOT add Node.js backend in Phase 2.5. The current metadata engine runs entirely on Supabase + React frontend. A Node service may be added in a later phase when workflow transitions, generic document CRUD, or plugin/module support require it.
