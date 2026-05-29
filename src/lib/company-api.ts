import { supabase } from "./supabase";

export type CompanyProfile = {
  id: string;
  name: string;
  slug: string;
  gst_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  industry_type: string | null;
  currency_code: string | null;
  financial_year_start: string | null;
};

function fail(message: string): never {
  throw new Error(message);
}

export async function getCompanyProfile(companyId: string): Promise<CompanyProfile | null> {
  const { data, error } = await supabase.rpc("get_company_profile", { p_company_id: companyId });
  if (error) fail(error.message);
  return (data?.[0] ?? null) as CompanyProfile | null;
}

export async function updateCompanyProfile(payload: {
  id: string;
  name: string;
  slug: string;
  gst_number: string | null;
  email: string;
  phone: string;
  address: string;
  logo_url: string | null;
  industry_type: string;
  currency_code: string;
  financial_year_start: string;
}): Promise<CompanyProfile> {
  const { data, error } = await supabase.rpc("update_company_profile", {
    p_payload: {
      id: payload.id,
      name: payload.name.trim(),
      slug: payload.slug.trim().toLowerCase(),
      gst_number: payload.gst_number?.trim() || null,
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      address: payload.address.trim(),
      logo_url: payload.logo_url?.trim() || null,
      industry_type: payload.industry_type.trim(),
      currency_code: payload.currency_code.trim().toUpperCase(),
      financial_year_start: payload.financial_year_start
    }
  });
  if (error) {
    console.error("[company-api] updateCompanyProfile error", error);
    fail([error.message, error.details, error.hint].filter(Boolean).join(" | "));
  }
  if (!data?.[0]) fail("No company profile returned");
  return data[0] as CompanyProfile;
}
