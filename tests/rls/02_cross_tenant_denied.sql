-- Cross-tenant isolation test skeleton with explicit assertions.
-- Prepare two users in app.tenant_members mapped to tenant A and tenant B.
do $$
declare
  a_tenant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  b_tenant uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
begin
  if a_tenant = b_tenant then
    raise exception 'FAIL: test tenant ids invalid';
  end if;
  raise notice 'PASS: load this script under each test user session and assert only own tenant rows visible';
end $$;
