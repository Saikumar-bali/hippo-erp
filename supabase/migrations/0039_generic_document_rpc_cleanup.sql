-- 0039_generic_document_rpc_cleanup.sql
-- Phase 4.9: Builder hardening + generic document RPC cleanup
--
-- Fixes the visible generic_json edit banner:
--   function row_to_jsonb(record) does not exist
--
-- Approach:
-- - redefine erp_get_document() to return an explicit jsonb object
-- - stop relying on the legacy row_to_jsonb(record) helper
-- - remove the helper after the RPC no longer references it

create or replace function public.erp_get_document(
  p_doctype_key text,
  p_document_id uuid,
  p_company_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctype record;
  v_doc record;
begin
  select doctype_key, is_active, storage_strategy, is_company_scoped
    into v_doctype
    from app.erp_doctypes
    where doctype_key = p_doctype_key;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'DocType not found');
  end if;

  if v_doctype.storage_strategy != 'generic_json' then
    return jsonb_build_object('ok', false, 'error', 'DocType uses physical_rpc storage');
  end if;

  if not public.current_user_has_doctype_permission(p_doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied');
  end if;

  select
    d.id,
    d.doctype_key,
    d.company_id,
    d.document_number,
    d.title,
    d.data,
    d.is_active,
    d.created_by,
    d.updated_by,
    d.created_at,
    d.updated_at
  into v_doc
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'id', v_doc.id,
      'doctype_key', v_doc.doctype_key,
      'company_id', v_doc.company_id,
      'document_number', v_doc.document_number,
      'title', v_doc.title,
      'data', v_doc.data,
      'is_active', v_doc.is_active,
      'created_by', v_doc.created_by,
      'updated_by', v_doc.updated_by,
      'created_at', v_doc.created_at,
      'updated_at', v_doc.updated_at
    )
  );
end;
$$;

drop function if exists public.row_to_jsonb(record);
