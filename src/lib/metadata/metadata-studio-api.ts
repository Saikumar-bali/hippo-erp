import { supabase } from "../supabase";

const meta = () => supabase.schema("app");

function mapRows<T>(data: unknown): T[] {
  return (data as T[]) ?? [];
}

// ── Field definitions for form generation ─────────────────────────────────────

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "number" | "boolean" | "json" | "select";
  required?: boolean;
  hidden?: boolean;
  options?: string[];
  default?: unknown;
  loadOptions?: () => Promise<{ value: string; label: string }[]>;
};

export type TableMeta = {
  table: string;
  label: string;
  fields: FieldDef[];
  orderBy: { column: string; ascending: boolean }[];
};

// ── Foreign key lookup helpers ────────────────────────────────────────────────

export async function loadModuleKeys() {
  const { data, error } = await meta().from("erp_modules").select("module_key, label").order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({ value: r.module_key as string, label: `${r.module_key} (${r.label})` }));
}

export async function loadDocTypeKeys() {
  const { data, error } = await meta().from("erp_doctypes").select("doctype_key, label").order("doctype_key", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({ value: r.doctype_key as string, label: `${r.doctype_key} (${r.label})` }));
}

export async function loadWorkflowKeys() {
  const { data, error } = await meta().from("erp_workflows").select("workflow_key, label").order("workflow_key", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({ value: r.workflow_key as string, label: `${r.workflow_key} (${r.label})` }));
}

export async function loadWorkspaceKeys() {
  const { data, error } = await meta().from("erp_workspaces").select("workspace_key, label").order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({ value: r.workspace_key as string, label: `${r.workspace_key} (${r.label})` }));
}

export const TABLES: Record<string, TableMeta> = {
  modules: {
    table: "erp_modules",
    label: "Modules",
    fields: [
      { name: "module_key", label: "Module Key", type: "text", required: true },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "description", label: "Description", type: "text" },
      { name: "icon", label: "Icon", type: "text" },
      { name: "route", label: "Route", type: "text" },
      { name: "sort_order", label: "Sort Order", type: "number" },
      { name: "is_active", label: "Active", type: "boolean", default: true },
    ],
    orderBy: [{ column: "sort_order", ascending: true }],
  },
  doctypes: {
    table: "erp_doctypes",
    label: "DocTypes",
    fields: [
      { name: "doctype_key", label: "DocType Key", type: "text", required: true },
      { name: "module_key", label: "Module Key", type: "select", required: true, loadOptions: loadModuleKeys },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "description", label: "Description", type: "text" },
      { name: "schema_name", label: "Schema Name", type: "text", required: true },
      { name: "table_name", label: "Table Name", type: "text", required: true },
      { name: "route", label: "Route", type: "text" },
      { name: "storage_strategy", label: "Storage Strategy", type: "select", options: ["physical_rpc", "generic_json"], required: true, default: "physical_rpc" },
      { name: "is_company_scoped", label: "Company Scoped", type: "boolean", default: true },
      { name: "is_submittable", label: "Submittable", type: "boolean" },
      { name: "is_child_table", label: "Child Table", type: "boolean" },
      { name: "is_single", label: "Single", type: "boolean" },
      { name: "is_active", label: "Active", type: "boolean", default: true },
      { name: "default_order_by", label: "Default Order By", type: "text" },
    ],
    orderBy: [{ column: "doctype_key", ascending: true }],
  },
  docfields: {
    table: "erp_docfields",
    label: "DocFields",
    fields: [
      { name: "doctype_key", label: "DocType Key", type: "select", required: true, loadOptions: loadDocTypeKeys },
      { name: "fieldname", label: "Field Name", type: "text", required: true },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "fieldtype", label: "Field Type", type: "text", required: true },
      { name: "db_column", label: "DB Column", type: "text" },
      { name: "options", label: "Options (JSON)", type: "json" },
      { name: "is_required", label: "Required", type: "boolean" },
      { name: "is_unique", label: "Unique", type: "boolean" },
      { name: "is_readonly", label: "Read Only", type: "boolean" },
      { name: "is_hidden", label: "Hidden", type: "boolean" },
      { name: "in_list_view", label: "In List View", type: "boolean" },
      { name: "in_standard_filter", label: "In Standard Filter", type: "boolean" },
      { name: "default_value", label: "Default Value", type: "text" },
      { name: "validation_rules", label: "Validation Rules (JSON)", type: "json" },
      { name: "depends_on", label: "Depends On (JSON)", type: "json" },
      { name: "sort_order", label: "Sort Order", type: "number" },
    ],
    orderBy: [{ column: "sort_order", ascending: true }],
  },
  doctype_actions: {
    table: "erp_doctype_actions",
    label: "DocType Actions",
    fields: [
      { name: "doctype_key", label: "DocType Key", type: "select", required: true, loadOptions: loadDocTypeKeys },
      { name: "action_key", label: "Action Key", type: "text", required: true },
      { name: "permission_key", label: "Permission Key", type: "text", required: true },
    ],
    orderBy: [{ column: "doctype_key", ascending: true }, { column: "action_key", ascending: true }],
  },
  list_views: {
    table: "erp_list_views",
    label: "List Views",
    fields: [
      { name: "doctype_key", label: "DocType Key", type: "select", required: true, loadOptions: loadDocTypeKeys },
      { name: "view_key", label: "View Key", type: "text", required: true },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "columns_json", label: "Columns (JSON)", type: "json", required: true },
      { name: "filters_json", label: "Filters (JSON)", type: "json" },
      { name: "search_fields_json", label: "Search Fields (JSON)", type: "json" },
      { name: "sort_json", label: "Sort (JSON)", type: "json" },
      { name: "is_default", label: "Is Default", type: "boolean" },
    ],
    orderBy: [{ column: "doctype_key", ascending: true }, { column: "view_key", ascending: true }],
  },
  form_layouts: {
    table: "erp_form_layouts",
    label: "Form Layouts",
    fields: [
      { name: "doctype_key", label: "DocType Key", type: "select", required: true, loadOptions: loadDocTypeKeys },
      { name: "layout_key", label: "Layout Key", type: "text", required: true },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "sections_json", label: "Sections (JSON)", type: "json", required: true },
      { name: "is_default", label: "Is Default", type: "boolean" },
    ],
    orderBy: [{ column: "doctype_key", ascending: true }, { column: "layout_key", ascending: true }],
  },
  naming_series: {
    table: "erp_naming_series",
    label: "Naming Series",
    fields: [
      { name: "doctype_key", label: "DocType Key", type: "select", required: true, loadOptions: loadDocTypeKeys },
      { name: "prefix", label: "Prefix", type: "text", required: true },
      { name: "year_format", label: "Year Format", type: "text", default: "YYYY" },
      { name: "current_number", label: "Current Number", type: "number" },
      { name: "padding", label: "Padding", type: "number", default: 5 },
      { name: "is_active", label: "Active", type: "boolean", default: true },
    ],
    orderBy: [{ column: "doctype_key", ascending: true }, { column: "prefix", ascending: true }],
  },
  workflows: {
    table: "erp_workflows",
    label: "Workflows",
    fields: [
      { name: "workflow_key", label: "Workflow Key", type: "text", required: true },
      { name: "doctype_key", label: "DocType Key", type: "select", required: true, loadOptions: loadDocTypeKeys },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "is_active", label: "Active", type: "boolean", default: true },
    ],
    orderBy: [{ column: "workflow_key", ascending: true }],
  },
  workspaces: {
    table: "erp_workspaces",
    label: "Workspaces",
    fields: [
      { name: "workspace_key", label: "Workspace Key", type: "text", required: true },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "description", label: "Description", type: "text" },
      { name: "icon", label: "Icon", type: "text" },
      { name: "sort_order", label: "Sort Order", type: "number" },
      { name: "is_active", label: "Active", type: "boolean", default: true },
    ],
    orderBy: [{ column: "sort_order", ascending: true }],
  },
  workspace_items: {
    table: "erp_workspace_items",
    label: "Workspace Items",
    fields: [
      { name: "workspace_key", label: "Workspace Key", type: "select", required: true, loadOptions: loadWorkspaceKeys },
      { name: "item_key", label: "Item Key", type: "text", required: true },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "item_type", label: "Item Type", type: "select", required: true, options: ["doctype", "workspace", "page", "report", "external"] },
      { name: "target", label: "Target", type: "text", required: true },
      { name: "icon", label: "Icon", type: "text" },
      { name: "sort_order", label: "Sort Order", type: "number" },
      { name: "is_active", label: "Active", type: "boolean", default: true },
      { name: "required_permission_key", label: "Required Permission Key", type: "text" },
    ],
    orderBy: [{ column: "sort_order", ascending: true }],
  },
};

// ── Read functions ────────────────────────────────────────────────────────────

export async function listAllFrom(tableKey: string) {
  const tm = TABLES[tableKey];
  if (!tm) throw new Error(`Unknown table key: ${tableKey}`);
  let q = meta().from(tm.table).select("*");
  for (const ob of tm.orderBy) {
    q = q.order(ob.column, { ascending: ob.ascending });
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return mapRows<Record<string, unknown>>(data);
}

export async function listAllDoctypes() {
  return listAllFrom("doctypes");
}

export async function listAllDocfields() {
  return listAllFrom("docfields");
}

export async function listAllWorkspaces() {
  return listAllFrom("workspaces");
}

export async function listAllWorkspaceItems() {
  return listAllFrom("workspace_items");
}

export async function listAllListViews() {
  return listAllFrom("list_views");
}

export async function listAllFormLayouts() {
  return listAllFrom("form_layouts");
}

export async function listAllDocTypeActions() {
  return listAllFrom("doctype_actions");
}

export async function listAllNamingSeries() {
  return listAllFrom("naming_series");
}

export async function listAllWorkflows() {
  return listAllFrom("workflows");
}

export async function listAllModules() {
  return listAllFrom("modules");
}

// ── Wizard bundle types ──────────────────────────────────────────────────────

export type WizardFieldInput = {
  fieldname: string;
  label: string;
  fieldtype: string;
  is_required: boolean;
  in_list_view: boolean;
  in_standard_filter: boolean;
  sort_order: number;
};

export type WizardActionInput = {
  action_key: string;
  permission_key: string;
};

export type WizardBundleInput = {
  doctype_key: string;
  module_key: string;
  label: string;
  description: string | null;
  route: string | null;
  storage_strategy: "generic_json" | "physical_rpc";
  is_company_scoped: boolean;
  fields: WizardFieldInput[];
  actions: WizardActionInput[];
  workspace_key: string;
  workspace_item_label: string;
};

// ── createCustomDocTypeBundle ─────────────────────────────────────────────────

export async function createCustomDocTypeBundle(input: WizardBundleInput) {
  const m = meta();

  const doctypeResult = await m.from("erp_doctypes").insert({
    doctype_key: input.doctype_key,
    module_key: input.module_key,
    label: input.label,
    description: input.description,
    schema_name: "app",
    table_name: "erp_documents",
    route: input.route,
    storage_strategy: input.storage_strategy,
    is_company_scoped: input.is_company_scoped,
    is_submittable: false,
    is_child_table: false,
    is_single: false,
    is_active: true,
  }).select().single();
  if (doctypeResult.error) throw new Error(`DocType: ${doctypeResult.error.message}`);

  for (const f of input.fields) {
    const r = await m.from("erp_docfields").insert({
      doctype_key: input.doctype_key,
      fieldname: f.fieldname,
      label: f.label,
      fieldtype: f.fieldtype,
      is_required: f.is_required,
      in_list_view: f.in_list_view,
      in_standard_filter: f.in_standard_filter,
      sort_order: f.sort_order,
      is_hidden: false,
      is_readonly: false,
      is_unique: false,
    }).select().single();
    if (r.error) throw new Error(`Field ${f.fieldname}: ${r.error.message}`);
  }

  const listViewColumns = input.fields
    .filter((f) => f.in_list_view)
    .map((f) => ({ fieldname: f.fieldname, label: f.label }));
  const searchFields = input.fields
    .filter((f) => f.fieldtype === "Data" || f.fieldtype === "Text")
    .map((f) => f.fieldname);
  const sortField = listViewColumns.length > 0
    ? { fieldname: listViewColumns[0].fieldname, direction: "asc" as const }
    : null;

  const lvResult = await m.from("erp_list_views").insert({
    doctype_key: input.doctype_key,
    view_key: `${input.doctype_key}_default`,
    label: `${input.label} List`,
    columns_json: listViewColumns,
    search_fields_json: searchFields,
    sort_json: sortField ?? {},
    is_default: true,
  }).select().single();
  if (lvResult.error) throw new Error(`List view: ${lvResult.error.message}`);

  const sectionFields = input.fields.map((f) => f.fieldname);
  const flResult = await m.from("erp_form_layouts").insert({
    doctype_key: input.doctype_key,
    layout_key: `${input.doctype_key}_default`,
    label: `${input.label} Form`,
    sections_json: [{ section: "Basic Info", columns: 1, fields: sectionFields }],
    is_default: true,
  }).select().single();
  if (flResult.error) throw new Error(`Form layout: ${flResult.error.message}`);

  for (const a of input.actions) {
    const r = await m.from("erp_doctype_actions").insert({
      doctype_key: input.doctype_key,
      action_key: a.action_key,
      permission_key: a.permission_key,
    }).select().single();
    if (r.error) throw new Error(`Action ${a.action_key}: ${r.error.message}`);
  }

  const wsResult = await m.from("erp_workspace_items").insert({
    workspace_key: input.workspace_key,
    item_key: input.doctype_key,
    label: input.workspace_item_label,
    item_type: "doctype",
    target: input.doctype_key,
    required_permission_key: input.actions.find((a) => a.action_key === "read")?.permission_key ?? null,
    is_active: true,
  }).select().single();
  if (wsResult.error) throw new Error(`Workspace item: ${wsResult.error.message}`);

  return { doctype_key: input.doctype_key, label: input.label };
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createRecord(tableKey: string, values: Record<string, unknown>) {
  const tm = TABLES[tableKey];
  if (!tm) throw new Error(`Unknown table key: ${tableKey}`);
  const { data, error } = await meta()
    .from(tm.table)
    .insert(values)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateRecord(tableKey: string, id: string, values: Record<string, unknown>) {
  const tm = TABLES[tableKey];
  if (!tm) throw new Error(`Unknown table key: ${tableKey}`);
  const { data, error } = await meta()
    .from(tm.table)
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteRecord(tableKey: string, id: string) {
  const tm = TABLES[tableKey];
  if (!tm) throw new Error(`Unknown table key: ${tableKey}`);
  const { error } = await meta()
    .from(tm.table)
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
