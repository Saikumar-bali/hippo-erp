-- GRN consistency test plan
-- 1) call wh.create_grn
-- 2) receive line with wh.receive_grn_line
-- 3) assert inventory_stock increased and one GRN movement exists
do $$
begin
  raise notice 'Use transactional test harness with authenticated warehouse_manager role';
end $$;
