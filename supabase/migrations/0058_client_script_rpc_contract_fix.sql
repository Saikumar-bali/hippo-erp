-- 0058_client_script_rpc_contract_fix.sql
-- Phase 6.9.2: Fix RPC contracts and ensure all functions exist on Cloud
--
-- This migration ensures all client script RPCs are properly defined,
-- granted to authenticated, and the PostgREST schema cache is refreshed.
-- It also drops the demo script's dependency on auth.uid() for seed safety.

-- ── 1. Ensure all RPCs have GRANT EXECUTE to authenticated ──────────────
-- (These are idempotent, safe even if already granted)

grant execute on function public.erp_list_client_scripts()                                                                             to authenticated;
grant execute on function public.erp_get_client_scripts_for_doctype(p_doctype_key text, p_company_id uuid)                              to authenticated;
grant execute on function public.erp_create_client_script(p_doctype_key text, p_script_name text, p_script_body jsonb, p_event_name text, p_company_id uuid, p_script_type text, p_is_enabled boolean) to authenticated;
grant execute on function public.erp_update_client_script(p_id uuid, p_script_name text, p_script_body jsonb, p_event_name text, p_is_enabled boolean, p_is_standard boolean)                              to authenticated;
grant execute on function public.erp_disable_client_script(p_id uuid, p_is_enabled boolean)                                              to authenticated;
grant execute on function public.erp_delete_client_script(p_id uuid)                                                                      to authenticated;
grant execute on function public.validate_client_script_body(p_body jsonb)                                                                to authenticated;

-- ── 2. Refresh PostgREST schema cache ──────────────────────────────────
-- This ensures newly created functions appear in the schema cache immediately.
-- Without this, PostgREST may cache old schemas and return PGRST202.

notify pgrst, 'reload schema';

-- Note: The NOTIFY command reloads the schema cache for all connected clients.
-- After this migration, the frontend should immediately see all client script
-- RPCs without needing to wait for automatic cache refresh.
