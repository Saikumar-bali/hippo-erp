-- 0035_wh_list_bins_rpc.sql
-- Expose warehouse_bins listing via RPC (bypasses schema exposure requirement)

create or replace function wh_list_bins(
  p_tenant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bins jsonb;
begin
  if not exists(select 1 from app.tenants where id = p_tenant_id) then
    return jsonb_build_object('ok', false, 'error', 'Tenant not found');
  end if;

  select coalesce(jsonb_agg(to_jsonb(b) order by b.bin_code), '[]'::jsonb) into v_bins
  from wh.warehouse_bins b
  where b.tenant_id = p_tenant_id;

  return jsonb_build_object('ok', true, 'data', v_bins);
end;
$$;

grant execute on function wh_list_bins(uuid) to authenticated;
