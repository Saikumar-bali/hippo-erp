-- 0024_metadata_crud_rls.sql
-- Phase 2.8: Enable CRUD operations on metadata tables for manage_metadata users
-- Schema: app

-- ── 1. Helper: check if current user has manage_metadata ─────────────────────

create or replace function app.current_user_has_manage_metadata()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app.company_role_assignments cra
    join app.company_roles cr on cra.role_id = cr.id and cr.is_active = true
    join app.company_role_permissions crp on crp.role_id = cr.id and crp.permission_key = 'manage_metadata' and crp.is_granted = true
    where cra.user_id = auth.uid() and cra.is_active = true
  );
$$;

-- ── 2. Replace blocked write policies with manage_metadata-gated policies ───

-- erp_modules
drop policy if exists erp_modules_insert_blocked on app.erp_modules;
create policy erp_modules_insert on app.erp_modules for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists erp_modules_update_blocked on app.erp_modules;
create policy erp_modules_update on app.erp_modules for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists erp_modules_delete_blocked on app.erp_modules;
create policy erp_modules_delete on app.erp_modules for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- erp_doctypes
drop policy if exists erp_doctypes_insert_blocked on app.erp_doctypes;
create policy erp_doctypes_insert on app.erp_doctypes for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists erp_doctypes_update_blocked on app.erp_doctypes;
create policy erp_doctypes_update on app.erp_doctypes for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists erp_doctypes_delete_blocked on app.erp_doctypes;
create policy erp_doctypes_delete on app.erp_doctypes for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- erp_docfields
drop policy if exists erp_docfields_insert_blocked on app.erp_docfields;
create policy erp_docfields_insert on app.erp_docfields for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists erp_docfields_update_blocked on app.erp_docfields;
create policy erp_docfields_update on app.erp_docfields for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists erp_docfields_delete_blocked on app.erp_docfields;
create policy erp_docfields_delete on app.erp_docfields for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- erp_doctype_actions
drop policy if exists erp_doctype_actions_insert_blocked on app.erp_doctype_actions;
create policy erp_doctype_actions_insert on app.erp_doctype_actions for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists erp_doctype_actions_update_blocked on app.erp_doctype_actions;
create policy erp_doctype_actions_update on app.erp_doctype_actions for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists erp_doctype_actions_delete_blocked on app.erp_doctype_actions;
create policy erp_doctype_actions_delete on app.erp_doctype_actions for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- erp_list_views
drop policy if exists erp_list_views_insert_blocked on app.erp_list_views;
create policy erp_list_views_insert on app.erp_list_views for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists erp_list_views_update_blocked on app.erp_list_views;
create policy erp_list_views_update on app.erp_list_views for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists erp_list_views_delete_blocked on app.erp_list_views;
create policy erp_list_views_delete on app.erp_list_views for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- erp_form_layouts
drop policy if exists erp_form_layouts_insert_blocked on app.erp_form_layouts;
create policy erp_form_layouts_insert on app.erp_form_layouts for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists erp_form_layouts_update_blocked on app.erp_form_layouts;
create policy erp_form_layouts_update on app.erp_form_layouts for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists erp_form_layouts_delete_blocked on app.erp_form_layouts;
create policy erp_form_layouts_delete on app.erp_form_layouts for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- erp_naming_series
drop policy if exists erp_naming_series_insert_blocked on app.erp_naming_series;
create policy erp_naming_series_insert on app.erp_naming_series for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists erp_naming_series_update_blocked on app.erp_naming_series;
create policy erp_naming_series_update on app.erp_naming_series for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists erp_naming_series_delete_blocked on app.erp_naming_series;
create policy erp_naming_series_delete on app.erp_naming_series for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- erp_workflows
drop policy if exists erp_workflows_insert_blocked on app.erp_workflows;
create policy erp_workflows_insert on app.erp_workflows for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists erp_workflows_update_blocked on app.erp_workflows;
create policy erp_workflows_update on app.erp_workflows for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists erp_workflows_delete_blocked on app.erp_workflows;
create policy erp_workflows_delete on app.erp_workflows for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- erp_workflow_states
drop policy if exists erp_workflow_states_insert_blocked on app.erp_workflow_states;
create policy erp_workflow_states_insert on app.erp_workflow_states for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists erp_workflow_states_update_blocked on app.erp_workflow_states;
create policy erp_workflow_states_update on app.erp_workflow_states for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists erp_workflow_states_delete_blocked on app.erp_workflow_states;
create policy erp_workflow_states_delete on app.erp_workflow_states for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- erp_workflow_transitions
drop policy if exists erp_workflow_transitions_insert_blocked on app.erp_workflow_transitions;
create policy erp_workflow_transitions_insert on app.erp_workflow_transitions for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists erp_workflow_transitions_update_blocked on app.erp_workflow_transitions;
create policy erp_workflow_transitions_update on app.erp_workflow_transitions for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists erp_workflow_transitions_delete_blocked on app.erp_workflow_transitions;
create policy erp_workflow_transitions_delete on app.erp_workflow_transitions for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- erp_workspaces (from 0021)
drop policy if exists "no insert on workspaces" on app.erp_workspaces;
create policy "manage_metadata insert workspaces" on app.erp_workspaces for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists "no update on workspaces" on app.erp_workspaces;
create policy "manage_metadata update workspaces" on app.erp_workspaces for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists "no delete on workspaces" on app.erp_workspaces;
create policy "manage_metadata delete workspaces" on app.erp_workspaces for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- erp_workspace_items (from 0021)
drop policy if exists "no insert on workspace_items" on app.erp_workspace_items;
create policy "manage_metadata insert workspace_items" on app.erp_workspace_items for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists "no update on workspace_items" on app.erp_workspace_items;
create policy "manage_metadata update workspace_items" on app.erp_workspace_items for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists "no delete on workspace_items" on app.erp_workspace_items;
create policy "manage_metadata delete workspace_items" on app.erp_workspace_items for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- Also update audit_logs and change_requests tables to allow insert with manage_metadata
drop policy if exists "no insert on audit logs" on app.erp_audit_logs;
create policy "manage_metadata insert audit_logs" on app.erp_audit_logs for insert
  to authenticated with check (app.current_user_has_manage_metadata());

drop policy if exists "no insert on change requests" on app.erp_metadata_change_requests;
create policy "manage_metadata insert change_requests" on app.erp_metadata_change_requests for insert
  to authenticated with check (app.current_user_has_manage_metadata());
drop policy if exists "no update on change requests" on app.erp_metadata_change_requests;
create policy "manage_metadata update change_requests" on app.erp_metadata_change_requests for update
  to authenticated using (true) with check (app.current_user_has_manage_metadata());
drop policy if exists "no delete on change requests" on app.erp_metadata_change_requests;
create policy "manage_metadata delete change_requests" on app.erp_metadata_change_requests for delete
  to authenticated using (app.current_user_has_manage_metadata());

-- ── 3. Audit trigger for metadata tables ─────────────────────────────────────

create or replace function app.metadata_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_changes jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'create';
    v_changes := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_changes := jsonb_build_object(
      'before', to_jsonb(old),
      'after', to_jsonb(new)
    );
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_changes := to_jsonb(old);
  end if;

  insert into app.erp_audit_logs (user_id, action, entity_type, entity_id, changes)
  values (auth.uid(), v_action, tg_table_schema || '.' || tg_table_name, coalesce(old.id::text, new.id::text), v_changes);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Apply trigger to all metadata tables
create trigger trg_erp_modules_audit after insert or update or delete on app.erp_modules
  for each row execute function app.metadata_audit_trigger();
create trigger trg_erp_doctypes_audit after insert or update or delete on app.erp_doctypes
  for each row execute function app.metadata_audit_trigger();
create trigger trg_erp_docfields_audit after insert or update or delete on app.erp_docfields
  for each row execute function app.metadata_audit_trigger();
create trigger trg_erp_doctype_actions_audit after insert or update or delete on app.erp_doctype_actions
  for each row execute function app.metadata_audit_trigger();
create trigger trg_erp_list_views_audit after insert or update or delete on app.erp_list_views
  for each row execute function app.metadata_audit_trigger();
create trigger trg_erp_form_layouts_audit after insert or update or delete on app.erp_form_layouts
  for each row execute function app.metadata_audit_trigger();
create trigger trg_erp_naming_series_audit after insert or update or delete on app.erp_naming_series
  for each row execute function app.metadata_audit_trigger();
create trigger trg_erp_workflows_audit after insert or update or delete on app.erp_workflows
  for each row execute function app.metadata_audit_trigger();
create trigger trg_erp_workflow_states_audit after insert or update or delete on app.erp_workflow_states
  for each row execute function app.metadata_audit_trigger();
create trigger trg_erp_workflow_transitions_audit after insert or update or delete on app.erp_workflow_transitions
  for each row execute function app.metadata_audit_trigger();
create trigger trg_erp_workspaces_audit after insert or update or delete on app.erp_workspaces
  for each row execute function app.metadata_audit_trigger();
create trigger trg_erp_workspace_items_audit after insert or update or delete on app.erp_workspace_items
  for each row execute function app.metadata_audit_trigger();
