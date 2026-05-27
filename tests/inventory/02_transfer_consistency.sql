-- Transfer consistency test plan
-- call create_stock_transfer + complete_stock_transfer then assert source decrease/destination increase and movement row count
do $$ begin raise notice 'Transfer test template ready'; end $$;
