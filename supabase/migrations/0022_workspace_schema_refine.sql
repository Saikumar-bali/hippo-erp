-- 0022_workspace_schema_refine.sql
-- Schema refinement: add explicit target columns per senior review feedback
-- Schema: app

-- ── 1. Add explicit target columns to erp_workspace_items ───────────────────

alter table app.erp_workspace_items
  add column if not exists target_doctype_key text,
  add column if not exists target_workspace_key text,
  add column if not exists route text;

-- ── 2. Backfill existing rows ───────────────────────────────────────────────

-- For doctype items: target IS the doctype key
update app.erp_workspace_items
set target_doctype_key = target
where item_type = 'doctype'
  and target_doctype_key is null;

-- For page items: target IS the route
update app.erp_workspace_items
set route = target
where item_type = 'page'
  and route is null;

-- ── 3. Add check constraint (idempotent via DO block) ───────────────────────

do $$
begin
  if not exists (
    select 1
    from pg_constraint con
    join pg_namespace n on n.oid = con.connamespace
    join pg_class c on c.oid = con.conrelid
    join pg_namespace cn on cn.oid = c.relnamespace
    where cn.nspname = 'app'
      and c.relname = 'erp_workspace_items'
      and con.conname = 'workspace_item_target_check'
  ) then
    alter table app.erp_workspace_items
      add constraint workspace_item_target_check
      check (
        target is not null
        or target_doctype_key is not null
        or target_workspace_key is not null
        or route is not null
      );
  end if;
end;
$$;
