-- Anonymous should not read business data
set local role anon;
select count(*) from wh.products;
