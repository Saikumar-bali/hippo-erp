-- Phase 5.0: CRM Metadata-First Module
--
-- Purpose:
-- - seed CRM as a metadata-only module using generic_json DocTypes
-- - avoid custom CRM RPCs and reuse the generic document engine
-- - provide builder-ready metadata plus working owner/admin access

-- ── 1. CRM module + workspace ────────────────────────────────────────────────

insert into app.erp_modules (
  module_key,
  label,
  description,
  icon,
  route,
  sort_order,
  is_active
) values (
  'crm',
  'CRM',
  'Customer relationship management using metadata-driven documents',
  'UsersRound',
  '/crm',
  35,
  true
)
on conflict (module_key) do update
set
  label = excluded.label,
  description = excluded.description,
  icon = excluded.icon,
  route = excluded.route,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into app.erp_workspaces (
  workspace_key,
  label,
  description,
  icon,
  sort_order,
  is_active
) values (
  'crm',
  'CRM',
  'Metadata-first CRM workspace for leads, accounts, contacts, opportunities, and follow-up tasks',
  'UsersRound',
  35,
  true
)
on conflict (workspace_key) do update
set
  label = excluded.label,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

-- ── 2. CRM DocTypes ──────────────────────────────────────────────────────────

insert into app.erp_doctypes (
  doctype_key,
  module_key,
  label,
  description,
  schema_name,
  table_name,
  route,
  is_company_scoped,
  is_submittable,
  is_child_table,
  is_single,
  is_active,
  default_order_by,
  storage_strategy
) values
  (
    'crm_lead',
    'crm',
    'Lead',
    'Potential customer or business interest captured through CRM.',
    'app',
    'erp_documents',
    '/crm/leads',
    true,
    false,
    false,
    false,
    true,
    'updated_at desc',
    'generic_json'
  ),
  (
    'crm_contact',
    'crm',
    'Contact',
    'Person record associated with an account or opportunity.',
    'app',
    'erp_documents',
    '/crm/contacts',
    true,
    false,
    false,
    false,
    true,
    'updated_at desc',
    'generic_json'
  ),
  (
    'crm_account',
    'crm',
    'Account',
    'Company or customer account tracked in CRM.',
    'app',
    'erp_documents',
    '/crm/accounts',
    true,
    false,
    false,
    false,
    true,
    'updated_at desc',
    'generic_json'
  ),
  (
    'crm_opportunity',
    'crm',
    'Opportunity',
    'Revenue opportunity tracked through the CRM pipeline.',
    'app',
    'erp_documents',
    '/crm/opportunities',
    true,
    false,
    false,
    false,
    true,
    'updated_at desc',
    'generic_json'
  ),
  (
    'crm_followup_task',
    'crm',
    'Follow-up Task',
    'Simple follow-up task linked to CRM activity.',
    'app',
    'erp_documents',
    '/crm/followups',
    true,
    false,
    false,
    false,
    true,
    'updated_at desc',
    'generic_json'
  )
on conflict (doctype_key) do update
set
  module_key = excluded.module_key,
  label = excluded.label,
  description = excluded.description,
  schema_name = excluded.schema_name,
  table_name = excluded.table_name,
  route = excluded.route,
  is_company_scoped = excluded.is_company_scoped,
  is_submittable = excluded.is_submittable,
  is_child_table = excluded.is_child_table,
  is_single = excluded.is_single,
  is_active = true,
  default_order_by = excluded.default_order_by,
  storage_strategy = excluded.storage_strategy,
  updated_at = now();

-- ── 3. CRM DocFields ─────────────────────────────────────────────────────────

delete from app.erp_docfields
where doctype_key in (
  'crm_lead',
  'crm_contact',
  'crm_account',
  'crm_opportunity',
  'crm_followup_task'
);

insert into app.erp_docfields (
  doctype_key,
  fieldname,
  label,
  fieldtype,
  options,
  is_required,
  is_unique,
  is_readonly,
  is_hidden,
  in_list_view,
  in_standard_filter,
  sort_order
) values
  ('crm_lead', 'lead_name', 'Lead Name', 'Data', '{}'::jsonb, true, false, false, false, true, true, 10),
  ('crm_lead', 'company_name', 'Company Name', 'Data', '{}'::jsonb, false, false, false, false, true, true, 20),
  ('crm_lead', 'email', 'Email', 'Data', '{}'::jsonb, false, false, false, false, true, true, 30),
  ('crm_lead', 'phone', 'Phone', 'Data', '{}'::jsonb, false, false, false, false, true, true, 40),
  ('crm_lead', 'source', 'Source', 'Select', '{"options":["Website","Referral","Campaign","Social","Other"]}'::jsonb, false, false, false, false, true, true, 50),
  ('crm_lead', 'status', 'Status', 'Select', '{"options":["New","Contacted","Qualified","Lost","Converted"]}'::jsonb, false, false, false, false, true, true, 60),
  ('crm_lead', 'owner_name', 'Owner Name', 'Data', '{}'::jsonb, false, false, false, false, true, true, 70),
  ('crm_lead', 'notes', 'Notes', 'Text', '{}'::jsonb, false, false, false, false, false, false, 80),
  ('crm_lead', 'is_active', 'Is Active', 'Check', '{}'::jsonb, false, false, false, false, true, true, 90),

  ('crm_contact', 'full_name', 'Full Name', 'Data', '{}'::jsonb, true, false, false, false, true, true, 10),
  ('crm_contact', 'account_name', 'Account Name', 'Data', '{}'::jsonb, false, false, false, false, true, true, 20),
  ('crm_contact', 'email', 'Email', 'Data', '{}'::jsonb, false, false, false, false, true, true, 30),
  ('crm_contact', 'phone', 'Phone', 'Data', '{}'::jsonb, false, false, false, false, true, true, 40),
  ('crm_contact', 'designation', 'Designation', 'Data', '{}'::jsonb, false, false, false, false, false, false, 50),
  ('crm_contact', 'contact_type', 'Contact Type', 'Select', '{"options":["Decision Maker","Influencer","User","Other"]}'::jsonb, false, false, false, false, true, true, 60),
  ('crm_contact', 'notes', 'Notes', 'Text', '{}'::jsonb, false, false, false, false, false, false, 70),
  ('crm_contact', 'is_active', 'Is Active', 'Check', '{}'::jsonb, false, false, false, false, true, true, 80),

  ('crm_account', 'account_name', 'Account Name', 'Data', '{}'::jsonb, true, false, false, false, true, true, 10),
  ('crm_account', 'industry', 'Industry', 'Data', '{}'::jsonb, false, false, false, false, true, true, 20),
  ('crm_account', 'website', 'Website', 'Data', '{}'::jsonb, false, false, false, false, false, false, 30),
  ('crm_account', 'phone', 'Phone', 'Data', '{}'::jsonb, false, false, false, false, false, false, 40),
  ('crm_account', 'city', 'City', 'Data', '{}'::jsonb, false, false, false, false, true, true, 50),
  ('crm_account', 'status', 'Status', 'Select', '{"options":["Active","Prospect","Dormant","Lost"]}'::jsonb, false, false, false, false, true, true, 60),
  ('crm_account', 'notes', 'Notes', 'Text', '{}'::jsonb, false, false, false, false, false, false, 70),
  ('crm_account', 'is_active', 'Is Active', 'Check', '{}'::jsonb, false, false, false, false, true, true, 80),

  ('crm_opportunity', 'opportunity_name', 'Opportunity Name', 'Data', '{}'::jsonb, true, false, false, false, true, true, 10),
  ('crm_opportunity', 'account_name', 'Account Name', 'Data', '{}'::jsonb, false, false, false, false, true, true, 20),
  ('crm_opportunity', 'contact_name', 'Contact Name', 'Data', '{}'::jsonb, false, false, false, false, true, true, 30),
  ('crm_opportunity', 'stage', 'Stage', 'Select', '{"options":["Qualification","Proposal","Negotiation","Won","Lost"]}'::jsonb, false, false, false, false, true, true, 40),
  ('crm_opportunity', 'expected_value', 'Expected Value', 'Float', '{}'::jsonb, false, false, false, false, true, true, 50),
  ('crm_opportunity', 'expected_close_date', 'Expected Close Date', 'Date', '{}'::jsonb, false, false, false, false, true, true, 60),
  ('crm_opportunity', 'probability', 'Probability', 'Int', '{}'::jsonb, false, false, false, false, false, false, 70),
  ('crm_opportunity', 'notes', 'Notes', 'Text', '{}'::jsonb, false, false, false, false, false, false, 80),
  ('crm_opportunity', 'is_active', 'Is Active', 'Check', '{}'::jsonb, false, false, false, false, true, true, 90),

  ('crm_followup_task', 'subject', 'Subject', 'Data', '{}'::jsonb, true, false, false, false, true, true, 10),
  ('crm_followup_task', 'related_to', 'Related To', 'Data', '{}'::jsonb, false, false, false, false, true, true, 20),
  ('crm_followup_task', 'due_date', 'Due Date', 'Date', '{}'::jsonb, false, false, false, false, true, true, 30),
  ('crm_followup_task', 'status', 'Status', 'Select', '{"options":["Open","Done","Cancelled"]}'::jsonb, false, false, false, false, true, true, 40),
  ('crm_followup_task', 'priority', 'Priority', 'Select', '{"options":["Low","Medium","High"]}'::jsonb, false, false, false, false, true, true, 50),
  ('crm_followup_task', 'assigned_to', 'Assigned To', 'Data', '{}'::jsonb, false, false, false, false, true, true, 60),
  ('crm_followup_task', 'notes', 'Notes', 'Text', '{}'::jsonb, false, false, false, false, false, false, 70),
  ('crm_followup_task', 'is_active', 'Is Active', 'Check', '{}'::jsonb, false, false, false, false, true, true, 80);

-- ── 4. CRM List Views ────────────────────────────────────────────────────────

delete from app.erp_list_views
where doctype_key in (
  'crm_lead',
  'crm_contact',
  'crm_account',
  'crm_opportunity',
  'crm_followup_task'
);

insert into app.erp_list_views (
  doctype_key,
  view_key,
  label,
  columns_json,
  filters_json,
  search_fields_json,
  sort_json,
  is_default
) values
  (
    'crm_lead',
    'default',
    'Default',
    '[{"fieldname":"lead_name","label":"Lead Name","width":220},{"fieldname":"company_name","label":"Company Name","width":200},{"fieldname":"email","label":"Email","width":220},{"fieldname":"source","label":"Source","width":140},{"fieldname":"status","label":"Status","width":140},{"fieldname":"owner_name","label":"Owner Name","width":180},{"fieldname":"is_active","label":"Status","width":90}]'::jsonb,
    '[{"fieldname":"source","label":"Source","type":"select","options":["Website","Referral","Campaign","Social","Other"]},{"fieldname":"status","label":"Status","type":"select","options":["New","Contacted","Qualified","Lost","Converted"]},{"fieldname":"is_active","label":"Is Active","type":"select","options":["true","false"]}]'::jsonb,
    '["lead_name","company_name","email","phone","owner_name"]'::jsonb,
    '{"fieldname":"lead_name","direction":"asc"}'::jsonb,
    true
  ),
  (
    'crm_contact',
    'default',
    'Default',
    '[{"fieldname":"full_name","label":"Full Name","width":220},{"fieldname":"account_name","label":"Account Name","width":200},{"fieldname":"email","label":"Email","width":220},{"fieldname":"phone","label":"Phone","width":160},{"fieldname":"contact_type","label":"Contact Type","width":170},{"fieldname":"is_active","label":"Status","width":90}]'::jsonb,
    '[{"fieldname":"contact_type","label":"Contact Type","type":"select","options":["Decision Maker","Influencer","User","Other"]},{"fieldname":"is_active","label":"Is Active","type":"select","options":["true","false"]}]'::jsonb,
    '["full_name","account_name","email","phone","designation"]'::jsonb,
    '{"fieldname":"full_name","direction":"asc"}'::jsonb,
    true
  ),
  (
    'crm_account',
    'default',
    'Default',
    '[{"fieldname":"account_name","label":"Account Name","width":220},{"fieldname":"industry","label":"Industry","width":180},{"fieldname":"city","label":"City","width":160},{"fieldname":"phone","label":"Phone","width":160},{"fieldname":"status","label":"Status","width":140},{"fieldname":"is_active","label":"Active","width":90}]'::jsonb,
    '[{"fieldname":"status","label":"Status","type":"select","options":["Active","Prospect","Dormant","Lost"]},{"fieldname":"is_active","label":"Is Active","type":"select","options":["true","false"]}]'::jsonb,
    '["account_name","industry","website","city","phone"]'::jsonb,
    '{"fieldname":"account_name","direction":"asc"}'::jsonb,
    true
  ),
  (
    'crm_opportunity',
    'default',
    'Default',
    '[{"fieldname":"opportunity_name","label":"Opportunity Name","width":240},{"fieldname":"account_name","label":"Account Name","width":200},{"fieldname":"contact_name","label":"Contact Name","width":200},{"fieldname":"stage","label":"Stage","width":150},{"fieldname":"expected_value","label":"Expected Value","width":140},{"fieldname":"expected_close_date","label":"Expected Close Date","width":160},{"fieldname":"is_active","label":"Status","width":90}]'::jsonb,
    '[{"fieldname":"stage","label":"Stage","type":"select","options":["Qualification","Proposal","Negotiation","Won","Lost"]},{"fieldname":"is_active","label":"Is Active","type":"select","options":["true","false"]}]'::jsonb,
    '["opportunity_name","account_name","contact_name"]'::jsonb,
    '{"fieldname":"opportunity_name","direction":"asc"}'::jsonb,
    true
  ),
  (
    'crm_followup_task',
    'default',
    'Default',
    '[{"fieldname":"subject","label":"Subject","width":240},{"fieldname":"related_to","label":"Related To","width":180},{"fieldname":"due_date","label":"Due Date","width":140},{"fieldname":"status","label":"Status","width":140},{"fieldname":"priority","label":"Priority","width":120},{"fieldname":"assigned_to","label":"Assigned To","width":180},{"fieldname":"is_active","label":"Active","width":90}]'::jsonb,
    '[{"fieldname":"status","label":"Status","type":"select","options":["Open","Done","Cancelled"]},{"fieldname":"priority","label":"Priority","type":"select","options":["Low","Medium","High"]},{"fieldname":"is_active","label":"Is Active","type":"select","options":["true","false"]}]'::jsonb,
    '["subject","related_to","assigned_to"]'::jsonb,
    '{"fieldname":"due_date","direction":"asc"}'::jsonb,
    true
  );

-- ── 5. CRM Form Layouts ──────────────────────────────────────────────────────

delete from app.erp_form_layouts
where doctype_key in (
  'crm_lead',
  'crm_contact',
  'crm_account',
  'crm_opportunity',
  'crm_followup_task'
);

insert into app.erp_form_layouts (
  doctype_key,
  layout_key,
  label,
  sections_json,
  is_default
) values
  (
    'crm_lead',
    'default',
    'Default',
    '[{"section":"Lead Details","columns":2,"fields":["lead_name","company_name","email","phone"]},{"section":"Qualification","columns":2,"fields":["source","status","owner_name","is_active"]},{"section":"Notes","columns":1,"fields":["notes"]}]'::jsonb,
    true
  ),
  (
    'crm_contact',
    'default',
    'Default',
    '[{"section":"Contact Details","columns":2,"fields":["full_name","account_name","email","phone"]},{"section":"Relationship","columns":2,"fields":["designation","contact_type","is_active"]},{"section":"Notes","columns":1,"fields":["notes"]}]'::jsonb,
    true
  ),
  (
    'crm_account',
    'default',
    'Default',
    '[{"section":"Account Details","columns":2,"fields":["account_name","industry","website","phone","city"]},{"section":"Status","columns":2,"fields":["status","is_active"]},{"section":"Notes","columns":1,"fields":["notes"]}]'::jsonb,
    true
  ),
  (
    'crm_opportunity',
    'default',
    'Default',
    '[{"section":"Deal Details","columns":2,"fields":["opportunity_name","account_name","contact_name","stage"]},{"section":"Forecast","columns":2,"fields":["expected_value","expected_close_date","probability","is_active"]},{"section":"Notes","columns":1,"fields":["notes"]}]'::jsonb,
    true
  ),
  (
    'crm_followup_task',
    'default',
    'Default',
    '[{"section":"Task Details","columns":2,"fields":["subject","related_to","due_date","status"]},{"section":"Assignment","columns":2,"fields":["priority","assigned_to","is_active"]},{"section":"Notes","columns":1,"fields":["notes"]}]'::jsonb,
    true
  );

-- ── 6. CRM DocType Actions ───────────────────────────────────────────────────

delete from app.erp_doctype_actions
where doctype_key in (
  'crm_lead',
  'crm_contact',
  'crm_account',
  'crm_opportunity',
  'crm_followup_task'
);

insert into app.erp_doctype_actions (
  doctype_key,
  action_key,
  permission_key
) values
  ('crm_lead', 'read', 'view_crm_lead'),
  ('crm_lead', 'create', 'create_crm_lead'),
  ('crm_lead', 'update', 'update_crm_lead'),
  ('crm_lead', 'deactivate', 'delete_crm_lead'),
  ('crm_contact', 'read', 'view_crm_contact'),
  ('crm_contact', 'create', 'create_crm_contact'),
  ('crm_contact', 'update', 'update_crm_contact'),
  ('crm_contact', 'deactivate', 'delete_crm_contact'),
  ('crm_account', 'read', 'view_crm_account'),
  ('crm_account', 'create', 'create_crm_account'),
  ('crm_account', 'update', 'update_crm_account'),
  ('crm_account', 'deactivate', 'delete_crm_account'),
  ('crm_opportunity', 'read', 'view_crm_opportunity'),
  ('crm_opportunity', 'create', 'create_crm_opportunity'),
  ('crm_opportunity', 'update', 'update_crm_opportunity'),
  ('crm_opportunity', 'deactivate', 'delete_crm_opportunity'),
  ('crm_followup_task', 'read', 'view_crm_followup_task'),
  ('crm_followup_task', 'create', 'create_crm_followup_task'),
  ('crm_followup_task', 'update', 'update_crm_followup_task'),
  ('crm_followup_task', 'deactivate', 'delete_crm_followup_task');

-- ── 7. Permission Catalog + System Grants ────────────────────────────────────

insert into app.permissions (
  permission_key,
  module_key,
  module_label,
  permission_label,
  description,
  sort_order
) values
  ('view_crm_lead', 'crm', 'CRM', 'View Lead', 'Read CRM leads.', 510),
  ('create_crm_lead', 'crm', 'CRM', 'Create Lead', 'Create CRM leads.', 511),
  ('update_crm_lead', 'crm', 'CRM', 'Update Lead', 'Update CRM leads.', 512),
  ('delete_crm_lead', 'crm', 'CRM', 'Deactivate Lead', 'Deactivate CRM leads.', 513),
  ('view_crm_contact', 'crm', 'CRM', 'View Contact', 'Read CRM contacts.', 520),
  ('create_crm_contact', 'crm', 'CRM', 'Create Contact', 'Create CRM contacts.', 521),
  ('update_crm_contact', 'crm', 'CRM', 'Update Contact', 'Update CRM contacts.', 522),
  ('delete_crm_contact', 'crm', 'CRM', 'Deactivate Contact', 'Deactivate CRM contacts.', 523),
  ('view_crm_account', 'crm', 'CRM', 'View Account', 'Read CRM accounts.', 530),
  ('create_crm_account', 'crm', 'CRM', 'Create Account', 'Create CRM accounts.', 531),
  ('update_crm_account', 'crm', 'CRM', 'Update Account', 'Update CRM accounts.', 532),
  ('delete_crm_account', 'crm', 'CRM', 'Deactivate Account', 'Deactivate CRM accounts.', 533),
  ('view_crm_opportunity', 'crm', 'CRM', 'View Opportunity', 'Read CRM opportunities.', 540),
  ('create_crm_opportunity', 'crm', 'CRM', 'Create Opportunity', 'Create CRM opportunities.', 541),
  ('update_crm_opportunity', 'crm', 'CRM', 'Update Opportunity', 'Update CRM opportunities.', 542),
  ('delete_crm_opportunity', 'crm', 'CRM', 'Deactivate Opportunity', 'Deactivate CRM opportunities.', 543),
  ('view_crm_followup_task', 'crm', 'CRM', 'View Follow-up Task', 'Read CRM follow-up tasks.', 550),
  ('create_crm_followup_task', 'crm', 'CRM', 'Create Follow-up Task', 'Create CRM follow-up tasks.', 551),
  ('update_crm_followup_task', 'crm', 'CRM', 'Update Follow-up Task', 'Update CRM follow-up tasks.', 552),
  ('delete_crm_followup_task', 'crm', 'CRM', 'Deactivate Follow-up Task', 'Deactivate CRM follow-up tasks.', 553)
on conflict (permission_key) do update
set
  module_key = excluded.module_key,
  module_label = excluded.module_label,
  permission_label = excluded.permission_label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into app.role_permission_grants (
  role,
  permission_key,
  is_granted
)
select role_name.role, perm.permission_key, true
from (values ('owner'::app.role_type), ('admin'::app.role_type)) as role_name(role)
cross join (
  values
    ('view_crm_lead'),
    ('create_crm_lead'),
    ('update_crm_lead'),
    ('delete_crm_lead'),
    ('view_crm_contact'),
    ('create_crm_contact'),
    ('update_crm_contact'),
    ('delete_crm_contact'),
    ('view_crm_account'),
    ('create_crm_account'),
    ('update_crm_account'),
    ('delete_crm_account'),
    ('view_crm_opportunity'),
    ('create_crm_opportunity'),
    ('update_crm_opportunity'),
    ('delete_crm_opportunity'),
    ('view_crm_followup_task'),
    ('create_crm_followup_task'),
    ('update_crm_followup_task'),
    ('delete_crm_followup_task')
) as perm(permission_key)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

-- ── 8. Tenant-level company role grants ──────────────────────────────────────

do $$
declare
  v_all_perm_keys text[] := array[
    'view_crm_lead','create_crm_lead','update_crm_lead','delete_crm_lead',
    'view_crm_contact','create_crm_contact','update_crm_contact','delete_crm_contact',
    'view_crm_account','create_crm_account','update_crm_account','delete_crm_account',
    'view_crm_opportunity','create_crm_opportunity','update_crm_opportunity','delete_crm_opportunity',
    'view_crm_followup_task','create_crm_followup_task','update_crm_followup_task','delete_crm_followup_task'
  ];
  v_sales_user_perm_keys text[] := array[
    'view_crm_lead','create_crm_lead','update_crm_lead',
    'view_crm_contact','create_crm_contact','update_crm_contact',
    'view_crm_account','create_crm_account','update_crm_account',
    'view_crm_opportunity','create_crm_opportunity','update_crm_opportunity',
    'view_crm_followup_task','create_crm_followup_task','update_crm_followup_task'
  ];
begin
  insert into app.company_role_permissions (role_id, permission_key, is_granted)
  select cr.id, perm.permission_key, true
  from app.company_roles cr
  cross join unnest(v_all_perm_keys) as perm(permission_key)
  where cr.is_active = true
    and cr.role_key in ('owner', 'admin')
  on conflict (role_id, permission_key) do update
  set is_granted = excluded.is_granted;

  insert into app.company_role_permissions (role_id, permission_key, is_granted)
  select cr.id, perm.permission_key, true
  from app.company_roles cr
  cross join unnest(v_all_perm_keys) as perm(permission_key)
  where cr.is_active = true
    and cr.role_key = 'sales_manager'
  on conflict (role_id, permission_key) do update
  set is_granted = excluded.is_granted;

  insert into app.company_role_permissions (role_id, permission_key, is_granted)
  select cr.id, perm.permission_key, true
  from app.company_roles cr
  cross join unnest(v_sales_user_perm_keys) as perm(permission_key)
  where cr.is_active = true
    and cr.role_key = 'sales_user'
  on conflict (role_id, permission_key) do update
  set is_granted = excluded.is_granted;
end;
$$;

-- ── 9. CRM Workspace Items ───────────────────────────────────────────────────

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
  ('crm', 'crm_lead', 'Leads', 'doctype', 'crm_lead', 'UserRoundPlus', 10, true, 'view_crm_lead'),
  ('crm', 'crm_contact', 'Contacts', 'doctype', 'crm_contact', 'ContactRound', 20, true, 'view_crm_contact'),
  ('crm', 'crm_account', 'Accounts', 'doctype', 'crm_account', 'Building2', 30, true, 'view_crm_account'),
  ('crm', 'crm_opportunity', 'Opportunities', 'doctype', 'crm_opportunity', 'BadgeDollarSign', 40, true, 'view_crm_opportunity'),
  ('crm', 'crm_followup_task', 'Follow-up Tasks', 'doctype', 'crm_followup_task', 'ListTodo', 50, true, 'view_crm_followup_task');
