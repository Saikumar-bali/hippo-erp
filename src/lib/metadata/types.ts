export interface ErpModuleMeta {
  id: string;
  module_key: string;
  label: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface DocTypeMeta {
  id: string;
  doctype_key: string;
  module_key: string;
  label: string;
  description: string | null;
  schema_name: string;
  table_name: string;
  route: string | null;
  is_company_scoped: boolean;
  is_submittable: boolean;
  is_child_table: boolean;
  is_single: boolean;
  is_active: boolean;
  default_order_by: string | null;
}

export type DocFieldType =
  | "Data"
  | "Text"
  | "Float"
  | "Int"
  | "Check"
  | "Select"
  | "Link"
  | "Date"
  | "Datetime"
  | "uuid"
  | "Status";

export interface DocFieldMeta {
  id: string;
  doctype_key: string;
  fieldname: string;
  label: string;
  fieldtype: DocFieldType;
  db_column: string | null;
  options: Record<string, unknown>;
  is_required: boolean;
  is_unique: boolean;
  is_readonly: boolean;
  is_hidden: boolean;
  in_list_view: boolean;
  in_standard_filter: boolean;
  default_value: string | null;
  validation_rules: Record<string, unknown>;
  depends_on: Record<string, unknown>;
  sort_order: number;
}

export interface DocTypeActionMeta {
  id: string;
  doctype_key: string;
  action_key: string;
  permission_key: string;
}

export interface ListViewColumn {
  fieldname: string;
  label: string;
  width?: number;
}

export interface ListViewFilter {
  fieldname: string;
  label: string;
  type: string;
  options?: string[];
  doctype?: string;
}

export interface ListViewMeta {
  id: string;
  doctype_key: string;
  view_key: string;
  label: string;
  columns_json: ListViewColumn[];
  filters_json: ListViewFilter[];
  search_fields_json: string[];
  sort_json: { fieldname: string; direction: "asc" | "desc" };
  is_default: boolean;
}

export interface FormLayoutSection {
  section: string;
  columns: number;
  fields: string[];
}

export interface FormLayoutMeta {
  id: string;
  doctype_key: string;
  layout_key: string;
  label: string;
  sections_json: FormLayoutSection[];
  is_default: boolean;
}

export interface NamingSeriesMeta {
  id: string;
  doctype_key: string;
  company_id: string | null;
  prefix: string;
  year_format: string;
  current_number: number;
  padding: number;
  is_active: boolean;
}

export interface WorkflowMeta {
  id: string;
  workflow_key: string;
  doctype_key: string;
  label: string;
  is_active: boolean;
}

export interface WorkflowStateMeta {
  id: string;
  workflow_key: string;
  state_key: string;
  label: string;
  sort_order: number;
}

export interface WorkflowTransitionMeta {
  id: string;
  workflow_key: string;
  from_state: string;
  to_state: string;
  action_label: string;
  required_permission_key: string | null;
}

export interface FullDocTypeConfig {
  doctype: DocTypeMeta;
  fields: DocFieldMeta[];
  actions: DocTypeActionMeta[];
  listView: ListViewMeta | null;
  formLayout: FormLayoutMeta | null;
  namingSeries: NamingSeriesMeta | null;
  workflow: WorkflowMeta | null;
}
