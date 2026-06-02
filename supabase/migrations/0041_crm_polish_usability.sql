-- Phase 5.1: CRM Polish & Usability Cleanup
--
-- Purpose:
-- - refine menu item order
-- - update list view columns to business requirements
-- - enhance field types for better form UX
-- - add CRM Dashboard route

-- ── 1. Refine Workspace Items Order & Dashboard ──────────────────────────────

delete from app.erp_workspace_items
where workspace_key = 'crm';

insert into app.erp_workspace_items (
  workspace_key,
  item_key,
  label,
  item_type,
  target,
  icon,
  sort_order,
  is_active,
  required_permission_key
) values
  ('crm', 'crm_dashboard', 'Dashboard', 'page', 'crm_dashboard', 'LayoutDashboard', 5, true, 'view_crm_lead'),
  ('crm', 'crm_lead', 'Leads', 'doctype', 'crm_lead', 'UserRoundPlus', 10, true, 'view_crm_lead'),
  ('crm', 'crm_account', 'Accounts', 'doctype', 'crm_account', 'Building2', 20, true, 'view_crm_account'),
  ('crm', 'crm_contact', 'Contacts', 'doctype', 'crm_contact', 'ContactRound', 30, true, 'view_crm_contact'),
  ('crm', 'crm_opportunity', 'Opportunities', 'doctype', 'crm_opportunity', 'BadgeDollarSign', 40, true, 'view_crm_opportunity'),
  ('crm', 'crm_followup_task', 'Follow-up Tasks', 'doctype', 'crm_followup_task', 'ListTodo', 50, true, 'view_crm_followup_task');

-- ── 2. Refine DocField Types for UX ──────────────────────────────────────────

update app.erp_docfields
set fieldtype = 'Small Text'
where fieldname = 'notes'
  and doctype_key in ('crm_lead', 'crm_contact', 'crm_account', 'crm_opportunity', 'crm_followup_task');

-- ── 3. Refine List Views ─────────────────────────────────────────────────────

-- Lead list
update app.erp_list_views
set columns_json = '[{"fieldname":"lead_name","label":"Lead Name","width":220},{"fieldname":"company_name","label":"Company","width":200},{"fieldname":"email","label":"Email","width":220},{"fieldname":"source","label":"Source","width":140},{"fieldname":"status","label":"Status","width":140},{"fieldname":"owner_name","label":"Owner","width":180}]'::jsonb
where doctype_key = 'crm_lead' and view_key = 'default';

-- Opportunity list
update app.erp_list_views
set columns_json = '[{"fieldname":"opportunity_name","label":"Opportunity","width":240},{"fieldname":"account_name","label":"Account","width":200},{"fieldname":"stage","label":"Stage","width":150},{"fieldname":"expected_value","label":"Value","width":140},{"fieldname":"expected_close_date","label":"Close Date","width":160},{"fieldname":"probability","label":"Probability","width":120}]'::jsonb
where doctype_key = 'crm_opportunity' and view_key = 'default';

-- Follow-up Task list
update app.erp_list_views
set columns_json = '[{"fieldname":"subject","label":"Subject","width":240},{"fieldname":"related_to","label":"Related To","width":180},{"fieldname":"due_date","label":"Due Date","width":140},{"fieldname":"status","label":"Status","width":140},{"fieldname":"priority","label":"Priority","width":120},{"fieldname":"assigned_to","label":"Assigned To","width":180}]'::jsonb
where doctype_key = 'crm_followup_task' and view_key = 'default';
