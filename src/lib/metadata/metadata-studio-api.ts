import { supabase } from "../supabase";

const meta = () => supabase.schema("app");

function mapRows<T>(data: unknown): T[] {
  return (data as T[]) ?? [];
}

export async function listAllDoctypes() {
  const { data, error } = await meta()
    .from("erp_doctypes")
    .select("*")
    .order("doctype_key", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<Record<string, unknown>>(data);
}

export async function listAllDocfields() {
  const { data, error } = await meta()
    .from("erp_docfields")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<Record<string, unknown>>(data);
}

export async function listAllWorkspaces() {
  const { data, error } = await meta()
    .from("erp_workspaces")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<Record<string, unknown>>(data);
}

export async function listAllWorkspaceItems() {
  const { data, error } = await meta()
    .from("erp_workspace_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<Record<string, unknown>>(data);
}

export async function listAllListViews() {
  const { data, error } = await meta()
    .from("erp_list_views")
    .select("*")
    .order("doctype_key", { ascending: true })
    .order("view_key", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<Record<string, unknown>>(data);
}

export async function listAllFormLayouts() {
  const { data, error } = await meta()
    .from("erp_form_layouts")
    .select("*")
    .order("doctype_key", { ascending: true })
    .order("layout_key", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<Record<string, unknown>>(data);
}

export async function listAllDocTypeActions() {
  const { data, error } = await meta()
    .from("erp_doctype_actions")
    .select("*")
    .order("doctype_key", { ascending: true })
    .order("action_key", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<Record<string, unknown>>(data);
}

export async function listAllNamingSeries() {
  const { data, error } = await meta()
    .from("erp_naming_series")
    .select("*")
    .order("doctype_key", { ascending: true })
    .order("prefix", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<Record<string, unknown>>(data);
}

export async function listAllWorkflows() {
  const { data, error } = await meta()
    .from("erp_workflows")
    .select("*")
    .order("workflow_key", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<Record<string, unknown>>(data);
}
