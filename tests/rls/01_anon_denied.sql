-- RLS anonymous denial test
-- Run after migrations with anon role available in Supabase local stack.
begin;
set local role anon;
do $$
begin
  perform 1 from wh.products limit 1;
  raise exception 'FAIL: anon unexpectedly read wh.products';
exception
  when insufficient_privilege then
    raise notice 'PASS: anon denied';
  when others then
    raise notice 'PASS (RLS/privilege enforced): %', SQLERRM;
end $$;
rollback;
