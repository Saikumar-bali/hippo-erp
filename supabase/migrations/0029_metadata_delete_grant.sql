-- 0029_metadata_delete_grant.sql
-- Grant DELETE on all app schema tables so Metadata Studio CRUD works
-- RLS policies in 0024 already gate deletion via manage_metadata

grant delete on all tables in schema app to authenticated;
alter default privileges in schema app grant delete on tables to authenticated;
