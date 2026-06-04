import { supabase } from "../supabase";
import { PrintFormat } from "./print-types";

export async function getPrintFormats(doctypeKey: string, tenantId: string): Promise<PrintFormat[]> {
  const { data, error } = await supabase
    .from("erp_print_formats")
    .select("*")
    .eq("doctype_key", doctypeKey)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("is_default", { ascending: false });

  if (error) {
    console.error("[print-api] getPrintFormats error:", error);
    return [];
  }

  return data as PrintFormat[];
}

export async function getDefaultPrintFormat(doctypeKey: string, tenantId: string): Promise<PrintFormat | null> {
  const { data, error } = await supabase
    .from("erp_print_formats")
    .select("*")
    .eq("doctype_key", doctypeKey)
    .eq("tenant_id", tenantId)
    .eq("is_default", true)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[print-api] getDefaultPrintFormat error:", error);
    }
    return null;
  }

  return data as PrintFormat;
}

export async function savePrintFormat(format: Partial<PrintFormat>): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("erp_print_formats").upsert(format);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
