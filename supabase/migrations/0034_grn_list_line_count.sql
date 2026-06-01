-- 0034_grn_list_line_count.sql
-- Phase 4.2: Enhance wh_list_grns to include line_count per GRN

create or replace function wh_list_grns(
  p_tenant_id uuid,
  p_status text default null,
  p_supplier_name text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grns jsonb;
  v_total int;
begin
  if not wh.current_user_has_grn_permission(p_tenant_id, 'view_grn') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: view_grn required');
  end if;

  select count(*) into v_total
  from wh.grns g
  where g.tenant_id = p_tenant_id
    and (p_status is null or g.status = p_status)
    and (p_supplier_name is null or g.supplier_name ilike '%' || p_supplier_name || '%')
    and (p_date_from is null or g.received_date >= p_date_from)
    and (p_date_to is null or g.received_date <= p_date_to);

  select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at desc), '[]'::jsonb) into v_grns
  from (
    select g.*,
      (select count(*) from wh.grn_lines gl where gl.grn_id = g.id) as line_count
    from wh.grns g
    where g.tenant_id = p_tenant_id
      and (p_status is null or g.status = p_status)
      and (p_supplier_name is null or g.supplier_name ilike '%' || p_supplier_name || '%')
      and (p_date_from is null or g.received_date >= p_date_from)
      and (p_date_to is null or g.received_date <= p_date_to)
    order by g.created_at desc
    limit p_limit
    offset p_offset
  ) g;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'grns', v_grns,
    'total', v_total
  ));
end;
$$;

grant execute on function wh_list_grns(uuid, text, text, date, date, int, int) to authenticated;
