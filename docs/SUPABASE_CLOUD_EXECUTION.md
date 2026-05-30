# Supabase Cloud Execution Rules

This project uses Supabase Cloud, not a local Supabase database, for active verification and seeding.

## Critical Secret Rule

Never commit Supabase access tokens, service-role keys, project access tokens, or personal access tokens to GitHub.

Never paste secrets into `tasks.md`, `progress.md`, `flow.md`, migration files, source files, or CLI-AI prompts.

Use local environment variables only.

Required local variables for cloud operations:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_ACCESS_TOKEN=...
```

The publishable key may be used in frontend `.env` files. Access tokens and service-role keys must stay local and server/CLI-only.

## Supabase Cloud Requirement For CLI-AI

Whenever a task includes migration, seed, or simulation verification, CLI-AI must treat Supabase Cloud as the target environment unless the user explicitly says otherwise.

CLI-AI must:

1. Read Supabase project URL from local env.
2. Use `SUPABASE_ACCESS_TOKEN` only from local env, never from committed files.
3. Apply migrations/seeds to the intended Supabase Cloud project/branch.
4. Run verification SQL against Supabase Cloud or provide exact SQL for Supabase SQL Editor.
5. Record exact results in `progress.md`.
6. Never print token values in logs, reports, screenshots, or committed files.

## Recommended Cloud Workflow

For each migration phase:

1. Create migration file in `supabase/migrations/`.
2. Apply it to Supabase Cloud using Supabase CLI/API or SQL Editor.
3. Run the matching simulation SQL from `tests/simulations/`.
4. Confirm `PASS` notices.
5. Run frontend verification:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

6. Update `progress.md` with:

- migration applied status
- target Supabase project/branch name, not secrets
- simulation result summary
- command results
- remaining gaps

## Forbidden

- Do not use local Supabase as the source of truth unless explicitly requested.
- Do not mark a migration complete only because the SQL file exists.
- Do not mark seed complete unless the seed exists in Supabase Cloud and is verified.
- Do not commit `.env` files containing tokens.
- Do not include tokens in GitHub commits or markdown docs.

## Rotation Rule

If a Supabase access token, service-role key, or personal access token is pasted into chat, screenshots, logs, or committed accidentally, rotate it immediately in Supabase before continuing.
