-- Role permissions test notes
-- Validate viewer/auditor cannot INSERT/UPDATE/DELETE while select works for own tenant.
do $$
begin
  raise notice 'Execute as viewer and auditor JWT: select should pass; inserts/updates/deletes should fail by policy';
end $$;
