export type ThemeDensityMode = "compact" | "comfortable";

export type CompanyThemeSettings = {
  company_id: string;
  company_name?: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  accent_color: string;
  sidebar_color: string;
  topbar_color: string;
  density_mode: ThemeDensityMode;
  custom_variables: Record<string, string>;
  updated_at?: string | null;
};

export type ThemeSettingsInput = Omit<CompanyThemeSettings, "company_name" | "updated_at">;

export const DEFAULT_THEME_SETTINGS: Omit<CompanyThemeSettings, "company_id"> = {
  company_name: "Hippo ERP",
  logo_url: null,
  favicon_url: null,
  primary_color: "#0f5f63",
  accent_color: "#f5b84b",
  sidebar_color: "#10243a",
  topbar_color: "#ffffff",
  density_mode: "compact",
  custom_variables: {},
  updated_at: null,
};

export const SAFE_THEME_VARIABLES = [
  "--hippo-focus-ring",
  "--hippo-success-color",
  "--hippo-warning-color",
  "--hippo-danger-color",
  "--hippo-info-color",
] as const;

export type SafeThemeVariableName = typeof SAFE_THEME_VARIABLES[number];
