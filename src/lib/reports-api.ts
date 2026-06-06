import { supabase } from "./supabase";

export type ReportColumn = {
  fieldname: string;
  label: string;
  fieldtype: string;
  width?: number;
  aggregation?: string;
};

export type ReportFilter = {
  fieldname: string;
  operator: string;
  default_value?: string;
  is_required: boolean;
  order_index: number;
};

export type ReportDefinition = {
  id: string;
  report_key: string;
  report_name: string;
  doctype_key: string;
  report_type: string;
  is_standard: boolean;
  columns: ReportColumn[];
  filters: ReportFilter[];
};

export type ReportRow = Record<string, unknown> & {
  id: string;
  docstatus?: number;
  workflow_state?: string;
  created_at?: string;
};

export type ReportResult = {
  data: ReportRow[];
  columns: ReportColumn[];
  row_count: number;
  truncated: boolean;
};

export type ReportListItem = {
  id: string;
  report_key: string;
  report_name: string;
  doctype_key: string;
  report_type: string;
  is_standard: boolean;
  is_active: boolean;
  created_at: string;
};

function unwrap<T>(rpcData: unknown): T {
  const r = rpcData as { ok?: boolean; data?: T; error?: string } | null;
  if (!r) throw new Error("No response from server");
  if (!r.ok) throw new Error(r.error ?? "Unknown error");
  return (r.data as T) ?? (undefined as T);
}

export async function listReports(companyId: string): Promise<ReportListItem[]> {
  const { data, error } = await supabase.rpc("erp_list_reports", {
    p_company_id: companyId,
  });
  if (error) throw new Error(error.message);
  return unwrap<ReportListItem[]>(data);
}

export async function getReportDefinition(
  reportId: string,
  companyId: string
): Promise<ReportDefinition> {
  const { data, error } = await supabase.rpc("erp_get_report_definition", {
    p_report_id: reportId,
    p_company_id: companyId,
  });
  if (error) throw new Error(error.message);
  return unwrap<ReportDefinition>(data);
}

export async function runReport(
  reportId: string,
  companyId: string,
  filters: Record<string, string> = {}
): Promise<ReportResult> {
  const { data, error } = await supabase.rpc("erp_run_report", {
    p_report_id: reportId,
    p_company_id: companyId,
    p_filters: filters,
  });
  if (error) throw new Error(error.message);
  const r = data as {
    ok?: boolean;
    data?: ReportRow[];
    columns?: ReportColumn[];
    row_count?: number;
    truncated?: boolean;
    error?: string;
  } | null;
  if (!r) throw new Error("No response from server");
  if (!r.ok) throw new Error(r.error ?? "Unknown error");
  return {
    data: r.data ?? [],
    columns: r.columns ?? [],
    row_count: r.row_count ?? 0,
    truncated: r.truncated ?? false,
  };
}

export async function createReport(
  companyId: string,
  reportKey: string,
  reportName: string,
  doctypeKey: string,
  columns: ReportColumn[],
  filters: ReportFilter[]
): Promise<string> {
  const { data, error } = await supabase.rpc("erp_create_report", {
    p_company_id: companyId,
    p_report_key: reportKey,
    p_report_name: reportName,
    p_doctype_key: doctypeKey,
    p_columns: columns,
    p_filters: filters,
  });
  if (error) throw new Error(error.message);
  const r = data as { ok?: boolean; report_id?: string; error?: string } | null;
  if (!r) throw new Error("No response from server");
  if (!r.ok) throw new Error(r.error ?? "Unknown error");
  return r.report_id ?? "";
}

export async function updateReport(
  reportId: string,
  companyId: string,
  reportName?: string,
  columns?: ReportColumn[],
  filters?: ReportFilter[]
): Promise<void> {
  const { data, error } = await supabase.rpc("erp_update_report", {
    p_report_id: reportId,
    p_company_id: companyId,
    p_report_name: reportName,
    p_columns: columns,
    p_filters: filters,
  });
  if (error) throw new Error(error.message);
  const r = data as { ok?: boolean; error?: string } | null;
  if (!r) throw new Error("No response from server");
  if (!r.ok) throw new Error(r.error ?? "Unknown error");
}

export async function resolveReportId(
  reportKey: string,
  companyId: string
): Promise<string> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(reportKey)) return reportKey;

  const reports = await listReports(companyId);
  const match = reports.find((r) => r.report_key === reportKey || r.id === reportKey);
  if (!match) throw new Error(`Report not found: ${reportKey}`);
  return match.id;
}

export async function deleteReport(
  reportId: string,
  companyId: string
): Promise<void> {
  const { data, error } = await supabase.rpc("erp_delete_report", {
    p_report_id: reportId,
    p_company_id: companyId,
  });
  if (error) throw new Error(error.message);
  const r = data as { ok?: boolean; error?: string } | null;
  if (!r) throw new Error("No response from server");
  if (!r.ok) throw new Error(r.error ?? "Unknown error");
}
