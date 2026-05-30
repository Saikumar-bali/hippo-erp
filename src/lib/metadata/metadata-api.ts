import { supabase } from "../supabase";
import type {
  ErpModuleMeta,
  DocTypeMeta,
  DocFieldMeta,
  DocTypeActionMeta,
  ListViewMeta,
  FormLayoutMeta,
  NamingSeriesMeta,
  WorkflowMeta,
  WorkflowStateMeta,
  WorkflowTransitionMeta,
  FullDocTypeConfig,
} from "./types";

const meta = () => supabase.schema("app");

function mapRow<T>(data: unknown): T {
  return data as T;
}

function mapRows<T>(data: unknown): T[] {
  return (data as T[]) ?? [];
}

export async function getModules(): Promise<ErpModuleMeta[]> {
  const { data, error } = await meta()
    .from("erp_modules")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<ErpModuleMeta>(data);
}

export async function getDocTypeMeta(doctypeKey: string): Promise<DocTypeMeta | null> {
  const { data, error } = await meta()
    .from("erp_doctypes")
    .select("*")
    .eq("doctype_key", doctypeKey)
    .eq("is_active", true)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return mapRow<DocTypeMeta>(data);
}

export async function getDocFields(doctypeKey: string): Promise<DocFieldMeta[]> {
  const { data, error } = await meta()
    .from("erp_docfields")
    .select("*")
    .eq("doctype_key", doctypeKey)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<DocFieldMeta>(data);
}

export async function getDocTypeActions(doctypeKey: string): Promise<DocTypeActionMeta[]> {
  const { data, error } = await meta()
    .from("erp_doctype_actions")
    .select("*")
    .eq("doctype_key", doctypeKey);
  if (error) throw new Error(error.message);
  return mapRows<DocTypeActionMeta>(data);
}

export async function getDefaultListView(doctypeKey: string): Promise<ListViewMeta | null> {
  const { data, error } = await meta()
    .from("erp_list_views")
    .select("*")
    .eq("doctype_key", doctypeKey)
    .eq("is_default", true)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return mapRow<ListViewMeta>(data);
}

export async function getDefaultFormLayout(doctypeKey: string): Promise<FormLayoutMeta | null> {
  const { data, error } = await meta()
    .from("erp_form_layouts")
    .select("*")
    .eq("doctype_key", doctypeKey)
    .eq("is_default", true)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return mapRow<FormLayoutMeta>(data);
}

export async function getFullDocTypeConfig(doctypeKey: string, companyId?: string): Promise<FullDocTypeConfig | null> {
  const doctype = await getDocTypeMeta(doctypeKey);
  if (!doctype) return null;

  const [fields, actions, listView, formLayout, namingSeries, workflows] = await Promise.all([
    getDocFields(doctypeKey),
    getDocTypeActions(doctypeKey),
    getDefaultListView(doctypeKey),
    getDefaultFormLayout(doctypeKey),
    companyId ? getNamingSeries(doctypeKey, companyId) : Promise.resolve(null),
    getWorkflows(doctypeKey),
  ]);

  return {
    doctype,
    fields,
    actions,
    listView,
    formLayout,
    namingSeries,
    workflow: workflows.length > 0 ? workflows[0] : null,
  };
}

export async function getNamingSeries(doctypeKey: string, companyId?: string): Promise<NamingSeriesMeta | null> {
  let query = meta()
    .from("erp_naming_series")
    .select("*")
    .eq("doctype_key", doctypeKey)
    .eq("is_active", true);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return mapRow<NamingSeriesMeta | null>(data);
}

export async function getWorkflows(doctypeKey: string): Promise<WorkflowMeta[]> {
  const { data, error } = await meta()
    .from("erp_workflows")
    .select("*")
    .eq("doctype_key", doctypeKey)
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return mapRows<WorkflowMeta>(data);
}

export async function getWorkflowStates(workflowKey: string): Promise<WorkflowStateMeta[]> {
  const { data, error } = await meta()
    .from("erp_workflow_states")
    .select("*")
    .eq("workflow_key", workflowKey)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return mapRows<WorkflowStateMeta>(data);
}

export async function getWorkflowTransitions(workflowKey: string): Promise<WorkflowTransitionMeta[]> {
  const { data, error } = await meta()
    .from("erp_workflow_transitions")
    .select("*")
    .eq("workflow_key", workflowKey);
  if (error) throw new Error(error.message);
  return mapRows<WorkflowTransitionMeta>(data);
}
