import { supabase } from "./supabase";
import { DEFAULT_THEME_SETTINGS, SAFE_THEME_VARIABLES, type CompanyThemeSettings, type ThemeSettingsInput } from "./theme-types";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function fail(message: string): never {
  throw new Error(message);
}

function cleanColor(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX_COLOR.test(value.trim()) ? value.trim() : fallback;
}

function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? trimmed : null;
  } catch {
    return null;
  }
}

export function sanitizeThemeInput(input: ThemeSettingsInput): ThemeSettingsInput {
  const custom_variables: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.custom_variables ?? {})) {
    if (SAFE_THEME_VARIABLES.includes(key as never) && HEX_COLOR.test(String(value))) {
      custom_variables[key] = String(value);
    }
  }

  return {
    company_id: input.company_id,
    logo_url: cleanUrl(input.logo_url),
    favicon_url: cleanUrl(input.favicon_url),
    primary_color: cleanColor(input.primary_color, DEFAULT_THEME_SETTINGS.primary_color),
    accent_color: cleanColor(input.accent_color, DEFAULT_THEME_SETTINGS.accent_color),
    sidebar_color: cleanColor(input.sidebar_color, DEFAULT_THEME_SETTINGS.sidebar_color),
    topbar_color: cleanColor(input.topbar_color, DEFAULT_THEME_SETTINGS.topbar_color),
    density_mode: input.density_mode === "comfortable" ? "comfortable" : "compact",
    custom_variables,
  };
}

function normalizeTheme(row: any, companyId: string): CompanyThemeSettings {
  return {
    company_id: row?.company_id ?? companyId,
    company_name: row?.company_name ?? DEFAULT_THEME_SETTINGS.company_name,
    logo_url: cleanUrl(row?.logo_url),
    favicon_url: cleanUrl(row?.favicon_url),
    primary_color: cleanColor(row?.primary_color, DEFAULT_THEME_SETTINGS.primary_color),
    accent_color: cleanColor(row?.accent_color, DEFAULT_THEME_SETTINGS.accent_color),
    sidebar_color: cleanColor(row?.sidebar_color, DEFAULT_THEME_SETTINGS.sidebar_color),
    topbar_color: cleanColor(row?.topbar_color, DEFAULT_THEME_SETTINGS.topbar_color),
    density_mode: row?.density_mode === "comfortable" ? "comfortable" : "compact",
    custom_variables: typeof row?.custom_variables === "object" && row.custom_variables !== null ? row.custom_variables : {},
    updated_at: row?.updated_at ?? null,
  };
}

export async function getCompanyTheme(companyId: string): Promise<CompanyThemeSettings> {
  if (!companyId) return { company_id: "", ...DEFAULT_THEME_SETTINGS };
  const { data, error } = await supabase.rpc("get_company_theme", { p_company_id: companyId });
  if (error) fail(error.message);
  return normalizeTheme(data?.[0], companyId);
}

export async function saveCompanyTheme(input: ThemeSettingsInput): Promise<CompanyThemeSettings> {
  const payload = sanitizeThemeInput(input);
  const { data, error } = await supabase.rpc("save_company_theme", { p_payload: payload });
  if (error) fail(error.message);
  return normalizeTheme(data?.[0], payload.company_id);
}

export async function resetCompanyTheme(companyId: string): Promise<CompanyThemeSettings> {
  const { data, error } = await supabase.rpc("reset_company_theme", { p_company_id: companyId });
  if (error) fail(error.message);
  return normalizeTheme(data?.[0], companyId);
}
