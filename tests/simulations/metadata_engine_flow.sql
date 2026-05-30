-- metadata_engine_flow.sql
-- Phase 2.5 Metadata-Driven ERP Core simulation.
-- Run in Supabase SQL Editor against a safe non-production branch/database.
-- This verifies metadata schema, seed data, RLS read intent, and write-block design.

begin;

-- ── 1. Verify metadata tables exist ──────────────────────────────────────────────

do $$
declare
  v_missing text;
begin
  select string_agg(required_table, ', ')
  into v_missing
  from (
    values
      ('erp_modules'),
      ('erp_doctypes'),
      ('erp_docfields'),
      ('erp_doctype_actions'),
      ('erp_list_views'),
      ('erp_form_layouts'),
      ('erp_naming_series'),
      ('erp_workflows'),
      ('erp_workflow_states'),
      ('erp_workflow_transitions')
  ) as r(required_table)
  where not exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'app'
      and t.table_name = r.required_table
  );

  if v_missing is not null then
    raise exception 'FAIL: missing metadata tables: %', v_missing;
  end if;

  raise notice 'PASS: all metadata tables exist';
end;
$$;

-- ── 2. Verify Product Master DocTypes exist ──────────────────────────────────────

do $$
declare
  v_count int;
begin
  select count(*)
  into v_count
  from app.erp_doctypes
  where doctype_key in ('product_category', 'unit_of_measure', 'product')
    and module_key = 'product_master'
    and is_active = true;

  if v_count <> 3 then
    raise exception 'FAIL: expected 3 active Product Master DocTypes, got %', v_count;
  end if;

  raise notice 'PASS: Product Master DocTypes seeded';
end;
$$;

-- ── 3. Verify required product fields exist ──────────────────────────────────────

do $$
declare
  v_missing text;
begin
  select string_agg(required_field, ', ')
  into v_missing
  from (
    values
      ('sku'),
      ('name'),
      ('description'),
      ('category_id'),
      ('uom_id'),
      ('barcode'),
      ('qr_value'),
      ('reorder_point'),
      ('reorder_quantity'),
      ('batch_tracking'),
      ('expiry_tracking'),
      ('is_active'),
      ('created_at'),
      ('updated_at'),
      ('created_by'),
      ('updated_by')
  ) as r(required_field)
  where not exists (
    select 1
    from app.erp_docfields f
    where f.doctype_key = 'product'
      and f.fieldname = r.required_field
  );

  if v_missing is not null then
    raise exception 'FAIL: missing product DocFields: %', v_missing;
  end if;

  raise notice 'PASS: Product DocFields seeded';
end;
$$;

-- ── 4. Verify Link field metadata avoids raw UUID display ────────────────────────

do $$
declare
  v_category_options jsonb;
  v_uom_options jsonb;
begin
  select options into v_category_options
  from app.erp_docfields
  where doctype_key = 'product' and fieldname = 'category_id';

  select options into v_uom_options
  from app.erp_docfields
  where doctype_key = 'product' and fieldname = 'uom_id';

  if coalesce(v_category_options->>'link_to', '') <> 'product_category' then
    raise exception 'FAIL: product.category_id link_to metadata is wrong: %', v_category_options;
  end if;

  if coalesce(v_uom_options->>'link_to', '') <> 'unit_of_measure' then
    raise exception 'FAIL: product.uom_id link_to metadata is wrong: %', v_uom_options;
  end if;

  if coalesce(v_category_options->>'display_field', '') = '' or coalesce(v_uom_options->>'display_field', '') = '' then
    raise exception 'FAIL: Link fields must define display_field to avoid raw UUIDs';
  end if;

  raise notice 'PASS: Link field metadata has display targets';
end;
$$;

-- ── 5. Verify action permissions map to existing product permission keys ─────────

do $$
declare
  v_missing text;
begin
  select string_agg(doctype_key || ':' || action_key, ', ')
  into v_missing
  from (
    values
      ('product_category', 'read', 'view_products'),
      ('product_category', 'create', 'create_product'),
      ('product_category', 'update', 'update_product'),
      ('product_category', 'deactivate', 'delete_product'),
      ('unit_of_measure', 'read', 'view_products'),
      ('unit_of_measure', 'create', 'create_product'),
      ('unit_of_measure', 'update', 'update_product'),
      ('unit_of_measure', 'deactivate', 'delete_product'),
      ('product', 'read', 'view_products'),
      ('product', 'create', 'create_product'),
      ('product', 'update', 'update_product'),
      ('product', 'deactivate', 'delete_product')
  ) as r(doctype_key, action_key, permission_key)
  where not exists (
    select 1
    from app.erp_doctype_actions a
    where a.doctype_key = r.doctype_key
      and a.action_key = r.action_key
      and a.permission_key = r.permission_key
  );

  if v_missing is not null then
    raise exception 'FAIL: missing DocType action mappings: %', v_missing;
  end if;

  raise notice 'PASS: DocType action permissions seeded';
end;
$$;

-- ── 6. Verify default list and form layouts exist ────────────────────────────────

do $$
declare
  v_list_count int;
  v_form_count int;
begin
  select count(*) into v_list_count
  from app.erp_list_views
  where doctype_key in ('product_category', 'unit_of_measure', 'product')
    and is_default = true;

  select count(*) into v_form_count
  from app.erp_form_layouts
  where doctype_key in ('product_category', 'unit_of_measure', 'product')
    and is_default = true;

  if v_list_count <> 3 then
    raise exception 'FAIL: expected 3 default list views, got %', v_list_count;
  end if;

  if v_form_count <> 3 then
    raise exception 'FAIL: expected 3 default form layouts, got %', v_form_count;
  end if;

  raise notice 'PASS: default list views and form layouts seeded';
end;
$$;

-- ── 7. Verify metadata tables have RLS enabled ───────────────────────────────────

do $$
declare
  v_not_secured text;
begin
  select string_agg(c.relname, ', ')
  into v_not_secured
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'app'
    and c.relname in (
      'erp_modules',
      'erp_doctypes',
      'erp_docfields',
      'erp_doctype_actions',
      'erp_list_views',
      'erp_form_layouts',
      'erp_naming_series',
      'erp_workflows',
      'erp_workflow_states',
      'erp_workflow_transitions'
    )
    and c.relrowsecurity = false;

  if v_not_secured is not null then
    raise exception 'FAIL: metadata tables without RLS: %', v_not_secured;
  end if;

  raise notice 'PASS: RLS enabled for metadata tables';
end;
$$;

-- ── 8. Verify no generic document write API exists yet ───────────────────────────
-- This is intentional. Phase 2.5 uses existing product-domain RPCs and must not add
-- unsafe generic table writes.

do $$
declare
  v_unsafe_count int;
begin
  select count(*)
  into v_unsafe_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'erp_create_document',
      'erp_update_document',
      'erp_delete_document',
      'erp_deactivate_document'
    );

  if v_unsafe_count > 0 then
    raise exception 'FAIL: generic document write APIs exist before safety design is implemented';
  end if;

  raise notice 'PASS: no unsafe generic document write API found';
end;
$$;

rollback;
