import { useEffect, useMemo, useState } from "react";
import { Palette, RotateCcw, Save, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { getCompanyTheme, resetCompanyTheme, sanitizeThemeInput, saveCompanyTheme } from "../../lib/theme-api";
import { DEFAULT_THEME_SETTINGS, type CompanyThemeSettings, type ThemeSettingsInput } from "../../lib/theme-types";

type Props = {
  initialCompanyId?: string;
  onThemeChanged?: (theme: CompanyThemeSettings) => void;
};

const COLOR_FIELDS: Array<{ key: keyof Pick<ThemeSettingsInput, "primary_color" | "accent_color" | "sidebar_color" | "topbar_color">; label: string; help: string }> = [
  { key: "primary_color", label: "Primary color", help: "Main action buttons, focus states, and selected navigation." },
  { key: "accent_color", label: "Accent color", help: "Highlights, warm callouts, and brand accents." },
  { key: "sidebar_color", label: "Sidebar color", help: "The left navigation background." },
  { key: "topbar_color", label: "Topbar color", help: "The workspace header background." },
];

function makeDraft(companyId: string, theme?: CompanyThemeSettings): ThemeSettingsInput {
  return {
    company_id: companyId,
    logo_url: theme?.logo_url ?? DEFAULT_THEME_SETTINGS.logo_url,
    favicon_url: theme?.favicon_url ?? DEFAULT_THEME_SETTINGS.favicon_url,
    primary_color: theme?.primary_color ?? DEFAULT_THEME_SETTINGS.primary_color,
    accent_color: theme?.accent_color ?? DEFAULT_THEME_SETTINGS.accent_color,
    sidebar_color: theme?.sidebar_color ?? DEFAULT_THEME_SETTINGS.sidebar_color,
    topbar_color: theme?.topbar_color ?? DEFAULT_THEME_SETTINGS.topbar_color,
    density_mode: theme?.density_mode ?? DEFAULT_THEME_SETTINGS.density_mode,
    custom_variables: theme?.custom_variables ?? {},
  };
}

export function ThemeStudioPage({ initialCompanyId, onThemeChanged }: Props) {
  const { tenants, selectedTenantId } = useAuth();
  const [companyId, setCompanyId] = useState(initialCompanyId || selectedTenantId || tenants[0]?.id || "");
  const [draft, setDraft] = useState<ThemeSettingsInput>(() => makeDraft(companyId));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedCompany = useMemo(() => tenants.find((tenant) => tenant.id === companyId), [companyId, tenants]);
  const safeDraft = useMemo(() => sanitizeThemeInput({ ...draft, company_id: companyId }), [companyId, draft]);

  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    queueMicrotask(() => {
      if (alive) setLoading(true);
    });
    getCompanyTheme(companyId)
      .then((theme) => {
        if (!alive) return;
        setDraft(makeDraft(companyId, theme));
        setMessage(theme.updated_at ? `Loaded saved branding updated ${new Date(theme.updated_at).toLocaleString()}.` : "Loaded default branding for this company.");
      })
      .catch((error: Error) => {
        if (!alive) return;
        setMessage(`Could not load branding: ${error.message}`);
        toast.error(error.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [companyId]);

  const updateDraft = (patch: Partial<ThemeSettingsInput>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const saved = await saveCompanyTheme(safeDraft);
      setDraft(makeDraft(companyId, saved));
      onThemeChanged?.(saved);
      setMessage("Branding saved. Your app shell will use these settings for this company.");
      toast.success("Theme saved");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save theme";
      setMessage(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const reset = await resetCompanyTheme(companyId);
      setDraft(makeDraft(companyId, reset));
      onThemeChanged?.(reset);
      setMessage("Branding reset to Hippo ERP defaults.");
      toast.success("Theme reset");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to reset theme";
      setMessage(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="studio-shell theme-studio-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Company settings</p>
          <h1>Theme Studio</h1>
          <p>Give each company a polished brand without scripts, unsafe CSS, or heavy custom code.</p>
        </div>
        <div className="page-header-actions">
          <button className="studio-button studio-button--ghost" type="button" onClick={handleReset} disabled={!companyId || saving}>
            <RotateCcw size={14} /> Reset default
          </button>
          <button className="studio-button" type="button" onClick={() => void handleSave()} disabled={!companyId || saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save theme"}
          </button>
        </div>
      </header>

      <section className="studio-hint theme-warning">
        <ShieldAlert size={16} />
        <span><strong>Safe customization only.</strong> JavaScript is not allowed, and custom CSS is limited to approved CSS variables. This keeps company branding secure and predictable.</span>
      </section>

      <div className="studio-grid studio-grid--two">
        <section className="studio-card">
          <div className="studio-section-heading">
            <Palette size={16} />
            <div>
              <h2>Brand controls</h2>
              <p>Choose the company, logo, colors, and workspace density.</p>
            </div>
          </div>

          <div className="studio-stack">
            <label className="studio-field">
              <span>Company</span>
              <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} disabled={loading}>
                {tenants.length === 0 ? <option value="">No companies available</option> : null}
                {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </label>

            <label className="studio-field">
              <span>Logo URL</span>
              <input value={draft.logo_url ?? ""} placeholder="https://example.com/logo.svg" onChange={(event) => updateDraft({ logo_url: event.target.value })} />
              <small>Shown in the sidebar and header when configured.</small>
            </label>

            <label className="studio-field">
              <span>Favicon URL</span>
              <input value={draft.favicon_url ?? ""} placeholder="https://example.com/favicon.png" onChange={(event) => updateDraft({ favicon_url: event.target.value })} />
              <small>Stored for future shell/favicon support.</small>
            </label>

            <div className="theme-color-grid">
              {COLOR_FIELDS.map((field) => (
                <label className="studio-field theme-color-field" key={field.key}>
                  <span>{field.label}</span>
                  <div className="theme-color-row">
                    <input type="color" value={safeDraft[field.key]} onChange={(event) => updateDraft({ [field.key]: event.target.value })} />
                    <input value={draft[field.key]} onChange={(event) => updateDraft({ [field.key]: event.target.value })} />
                  </div>
                  <small>{field.help}</small>
                </label>
              ))}
            </div>

            <fieldset className="theme-density-options">
              <legend>Density</legend>
              <label>
                <input type="radio" name="density" value="compact" checked={draft.density_mode === "compact"} onChange={() => updateDraft({ density_mode: "compact" })} />
                <span><strong>Compact</strong><small>More rows, tighter cards, enterprise default.</small></span>
              </label>
              <label>
                <input type="radio" name="density" value="comfortable" checked={draft.density_mode === "comfortable"} onChange={() => updateDraft({ density_mode: "comfortable" })} />
                <span><strong>Comfortable</strong><small>Slightly larger controls for slower review work.</small></span>
              </label>
            </fieldset>
          </div>
        </section>

        <section className="studio-card theme-preview-card">
          <div className="studio-section-heading">
            <Sparkles size={16} />
            <div>
              <h2>Live preview</h2>
              <p>Preview updates instantly before saving.</p>
            </div>
          </div>

          <div className={`theme-preview density-${safeDraft.density_mode}`} style={{
            ["--theme-preview-primary" as string]: safeDraft.primary_color,
            ["--theme-preview-accent" as string]: safeDraft.accent_color,
            ["--theme-preview-sidebar" as string]: safeDraft.sidebar_color,
            ["--theme-preview-topbar" as string]: safeDraft.topbar_color,
          }}>
            <aside>
              <div className="theme-preview-brand">
                {safeDraft.logo_url ? <img src={safeDraft.logo_url} alt="Company logo preview" /> : <span>{(selectedCompany?.name ?? "H").slice(0, 1)}</span>}
                <strong>{selectedCompany?.name ?? "Company"}</strong>
              </div>
              <button className="active">Dashboard</button>
              <button>Metadata Studio</button>
              <button>Access Control</button>
            </aside>
            <main>
              <header><strong>Workspace</strong><span className="status-badge status-badge--success">Active</span></header>
              <div className="theme-preview-body">
                <div className="theme-preview-cardlet"><span>Open leads</span><strong>24</strong></div>
                <div className="theme-preview-cardlet"><span>Draft GRNs</span><strong>8</strong></div>
                <button>Primary action</button>
              </div>
            </main>
          </div>

          {message ? <p className="studio-hint">{message}</p> : null}
        </section>
      </div>
    </div>
  );
}
