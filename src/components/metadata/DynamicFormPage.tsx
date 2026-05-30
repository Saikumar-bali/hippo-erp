import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDocTypeConfig } from "../../lib/metadata/doctype-registry";
import { getDocTypeApi } from "./doctype-api-map";
import type { DocFieldMeta, FormLayoutSection } from "../../lib/metadata/types";

type Props = {
  doctypeKey: string;
  tenantId: string;
  recordId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
  action: "create" | "update";
};

export function DynamicFormPage({
  doctypeKey,
  tenantId,
  recordId,
  onSaved,
  onCancel,
  action,
}: Props) {
  const { config, loading: metaLoading, error: metaError } = useDocTypeConfig(doctypeKey);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [linkOptions, setLinkOptions] = useState<Record<string, Array<{ id: string; label: string }>>>({});
  const [linkSearch, setLinkSearch] = useState<Record<string, string>>({});
  const [linkFocus, setLinkFocus] = useState<Record<string, boolean>>({});
  const linkRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const api = useMemo(() => getDocTypeApi(doctypeKey), [doctypeKey]);

  useEffect(() => {
    if (action !== "update" || !recordId || !api) return;
    let cancelled = false;
    setDataLoading(true);
    api.get(recordId)
      .then((data) => {
        if (!cancelled) setRecord(data as Record<string, unknown>);
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Failed to load record");
      })
      .finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
  }, [action, recordId, api]);

  useEffect(() => {
    if (!config) return;
    const linkFields = config.fields.filter((f) => f.fieldtype === "Link");
    if (linkFields.length === 0) return;

    const loadOptions = async () => {
      const opts: Record<string, Array<{ id: string; label: string }>> = {};
      for (const lf of linkFields) {
        const linkTo = (lf.options as Record<string, unknown>)?.link_to as string | undefined;
        if (!linkTo) continue;
        const linkApi = getDocTypeApi(linkTo);
        if (!linkApi?.list) continue;
        try {
          const items = await linkApi.list(tenantId) as Array<Record<string, unknown>>;
          const displayField = (lf.options as Record<string, unknown>)?.display_field as string ?? "name";
          opts[lf.fieldname] = items.map((item) => ({
            id: String(item.id),
            label: `${String(item[displayField] ?? "")} - ${String(item.name ?? item.code ?? "")}`,
          }));
        } catch {
          opts[lf.fieldname] = [];
        }
        const currentValue = record?.[lf.fieldname] as string | undefined;
        if (currentValue && opts[lf.fieldname]) {
          const match = opts[lf.fieldname].find((o) => o.id === currentValue);
          if (match) {
            setLinkSearch((prev) => ({ ...prev, [lf.fieldname]: match.label }));
          }
        }
      }
      setLinkOptions(opts);
    };
    void loadOptions();
  }, [config, tenantId, record]);

  const fieldMap = useMemo(() => {
    const m = new Map<string, DocFieldMeta>();
    if (config) for (const f of config.fields) m.set(f.fieldname, f);
    return m;
  }, [config]);

  const layout = config?.formLayout;
  const sections: FormLayoutSection[] = layout?.sections_json ?? [
    { section: "Details", columns: 2, fields: config?.fields.filter((f) => !f.is_hidden).map((f) => f.fieldname) ?? [] },
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!api) return;
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    const validationErrors: Record<string, string> = {};

    for (const f of config?.fields ?? []) {
      if (f.is_hidden || f.is_readonly || f.fieldname === "id") continue;
      const raw = fd.get(f.fieldname);
      let value: unknown = raw;

      if (f.fieldtype === "Check") {
        value = fd.get(f.fieldname) === "on";
      } else if (f.fieldtype === "Float" || f.fieldtype === "Int") {
        value = raw ? Number(raw) : 0;
      } else if (f.fieldtype === "Link") {
        const linkInput = fd.get(`${f.fieldname}_id`);
        value = linkInput ?? raw;
      }

      if (f.is_required && (value === "" || value === null || value === undefined)) {
        validationErrors[f.fieldname] = `${f.label} is required.`;
      }

      data[f.fieldname] = value;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      if (action === "create") {
        await api.create?.({ tenant_id: tenantId, ...data });
        toast.success(`${config?.doctype.label} created.`);
      } else if (recordId) {
        await api.update?.(recordId, data);
        toast.success(`${config?.doctype.label} updated.`);
      }
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      toast.error(msg);
      setErrors({ form: msg });
    } finally {
      setSaving(false);
    }
  };

  if (metaLoading || dataLoading) {
    return <div className="card state-info">Loading…</div>;
  }

  if (metaError) return <div className="card state-error">{metaError}</div>;
  if (!config) return <div className="card state-error">Unknown DocType: {doctypeKey}</div>;

  const renderField = (field: DocFieldMeta) => {
    if (field.is_hidden) return null;
    const currentValue = record?.[field.fieldname];
    const defaultValue = field.default_value ?? "";
    const isReadonly = field.is_readonly || (action === "update" && (field.fieldname === "created_by" || field.fieldname === "created_at"));

    if (field.fieldtype === "Check") {
      return (
        <label key={field.fieldname} className="field field--checkbox">
          <input
            type="checkbox"
            name={field.fieldname}
            defaultChecked={(currentValue as boolean) ?? (defaultValue === "true")}
            disabled={isReadonly}
          />
          <span>{field.label}</span>
          {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
        </label>
      );
    }

    if (field.fieldtype === "Link") {
      const options = linkOptions[field.fieldname] ?? [];
      const search = linkSearch[field.fieldname] ?? "";
      const focused = linkFocus[field.fieldname] ?? false;
      const filtered = focused && search.length > 0
        ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
        : options;

      return (
        <label key={field.fieldname} className="field field--link">
          <span>{field.label}{field.is_required ? " *" : ""}</span>
          <div
            ref={(el) => { linkRefs.current[field.fieldname] = el; }}
            style={{ position: "relative" }}
          >
            <input
              type="text"
              name={`${field.fieldname}_display`}
              placeholder={`Search ${field.label}…`}
              value={search}
              onChange={(e) => setLinkSearch((prev) => ({ ...prev, [field.fieldname]: e.target.value }))}
              onFocus={() => setLinkFocus((prev) => ({ ...prev, [field.fieldname]: true }))}
              onBlur={() => setTimeout(() => setLinkFocus((prev) => ({ ...prev, [field.fieldname]: false })), 200)}
              required={field.is_required}
              disabled={isReadonly}
              autoComplete="off"
            />
            <input type="hidden" name={`${field.fieldname}_id`} value={(currentValue as string) ?? ""} />
            {focused && filtered.length > 0 && (
              <div
                className="typeahead-dropdown"
                style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "#fff", border: "1px solid #e0e7ef", maxHeight: 200, overflowY: "auto" }}
              >
                {filtered.slice(0, 50).map((opt) => (
                  <div
                    key={opt.id}
                    className="typeahead-item"
                    style={{ padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                    onMouseDown={() => {
                      setLinkSearch((prev) => ({ ...prev, [field.fieldname]: opt.label }));
                      setLinkFocus((prev) => ({ ...prev, [field.fieldname]: false }));
                      const hiddenInput = document.querySelector<HTMLInputElement>(`input[name="${field.fieldname}_id"]`);
                      if (hiddenInput) hiddenInput.value = opt.id;
                      const displayInput = document.querySelector<HTMLInputElement>(`input[name="${field.fieldname}_display"]`);
                      if (displayInput) displayInput.value = opt.label;
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
        </label>
      );
    }

    if (field.fieldtype === "Select") {
      const opts = (field.options as Record<string, unknown>)?.options as string[] ?? [];
      return (
        <label key={field.fieldname} className="field">
          <span>{field.label}{field.is_required ? " *" : ""}</span>
          <select
            name={field.fieldname}
            defaultValue={(currentValue as string) ?? defaultValue}
            required={field.is_required}
            disabled={isReadonly}
          >
            <option value="">Select {field.label}…</option>
            {opts.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
        </label>
      );
    }

    if (field.fieldtype === "Text") {
      return (
        <label key={field.fieldname} className="field field--wide">
          <span>{field.label}{field.is_required ? " *" : ""}</span>
          <textarea
            name={field.fieldname}
            defaultValue={(currentValue as string) ?? defaultValue}
            rows={3}
            required={field.is_required}
            disabled={isReadonly}
          />
          {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
        </label>
      );
    }

    if (field.fieldtype === "Datetime" || field.fieldtype === "Date") {
      return (
        <label key={field.fieldname} className="field">
          <span>{field.label}{field.is_required ? " *" : ""}</span>
          <input
            type={field.fieldtype === "Date" ? "date" : "datetime-local"}
            name={field.fieldname}
            defaultValue={(currentValue as string) ? (currentValue as string).slice(0, field.fieldtype === "Date" ? 10 : 16) : defaultValue}
            required={field.is_required}
            disabled={isReadonly}
          />
          {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
        </label>
      );
    }

    const inputType = field.fieldtype === "Float" || field.fieldtype === "Int" ? "number" : "text";

    return (
      <label key={field.fieldname} className="field">
        <span>{field.label}{field.is_required ? " *" : ""}</span>
        <input
          type={inputType}
          name={field.fieldname}
          defaultValue={(currentValue as string) ?? defaultValue}
          required={field.is_required}
          disabled={isReadonly}
          min={field.fieldtype === "Float" || field.fieldtype === "Int" ? "0" : undefined}
          step={field.fieldtype === "Float" ? "any" : undefined}
        />
        {errors[field.fieldname] && <span className="field-error">{errors[field.fieldname]}</span>}
      </label>
    );
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3>{action === "create" ? "New" : "Edit"} {config.doctype.label}</h3>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        {sections.map((sec) => (
          <div key={sec.section} style={{ gridColumn: "1 / -1" }}>
            <h4 className="detail-section-title">{sec.section}</h4>
            <div className={sec.columns === 1 ? "" : ""} style={{ display: "contents" }}>
              {sec.fields.map((fn) => {
                const field = fieldMap.get(fn);
                return field ? renderField(field) : null;
              })}
            </div>
          </div>
        ))}
        {errors.form && <div className="state-error" style={{ gridColumn: "1 / -1" }}>{errors.form}</div>}
        <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
          <button type="submit" className="primary-action" disabled={saving}>
            {saving ? "Saving…" : action === "create" ? `Create ${config.doctype.label}` : `Update ${config.doctype.label}`}
          </button>
          <button type="button" className="logout" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
