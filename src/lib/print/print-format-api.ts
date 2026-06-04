import { supabase } from "../supabase";
import { PrintFormat } from "./print-types";

type DefaultPrintSeed = Pick<
  PrintFormat,
  "tenant_id" | "doctype_key" | "format_key" | "label" | "is_default" | "is_active" | "layout_json" | "header_json" | "footer_json"
>;

function buildDefaultPrintSeed(doctypeKey: string, tenantId: string): DefaultPrintSeed | null {
  if (doctypeKey === "crm_lead") {
    return {
      tenant_id: tenantId,
      doctype_key: "crm_lead",
      format_key: "standard",
      label: "Standard",
      is_default: true,
      is_active: true,
      layout_json: {
        sections: [
          { label: "Lead Details", fields: ["lead_name", "company_name", "email", "phone"] },
          { label: "Qualification", fields: ["source", "status", "owner_name"] },
          { label: "Notes", fields: ["notes"] },
        ],
      },
      header_json: {},
      footer_json: {},
    };
  }

  if (doctypeKey === "crm_opportunity") {
    return {
      tenant_id: tenantId,
      doctype_key: "crm_opportunity",
      format_key: "standard",
      label: "Standard",
      is_default: true,
      is_active: true,
      layout_json: {
        sections: [
          { label: "Deal Details", fields: ["opportunity_name", "account_name", "contact_name"] },
          { label: "Forecast", fields: ["stage", "expected_value", "expected_close_date", "probability"] },
          { label: "Notes", fields: ["notes"] },
        ],
      },
      header_json: {},
      footer_json: {},
    };
  }

  return null;
}

export function getBuiltInPrintFormat(doctypeKey: string, tenantId: string): PrintFormat | null {
  const seed = buildDefaultPrintSeed(doctypeKey, tenantId);
  if (!seed) return null;

  const now = new Date().toISOString();
  return {
    id: `builtin-${tenantId}-${doctypeKey}`,
    ...seed,
    created_at: now,
    updated_at: now,
  };
}

async function ensureDefaultPrintFormat(doctypeKey: string, tenantId: string): Promise<PrintFormat | null> {
  const seed = buildDefaultPrintSeed(doctypeKey, tenantId);
  if (!seed) return null;

  const { data, error } = await supabase
    .from("erp_print_formats")
    .insert(seed)
    .select("*")
    .single();

  if (error) {
    console.error("[print-api] ensureDefaultPrintFormat error:", error);
    return null;
  }

  return data as PrintFormat;
}

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

  if ((data?.length ?? 0) === 0) {
    const seeded = await ensureDefaultPrintFormat(doctypeKey, tenantId);
    return seeded ? [seeded] : [];
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
