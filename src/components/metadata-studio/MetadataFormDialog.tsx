import { useEffect, useState } from "react";
import type { FieldDef } from "../../lib/metadata/metadata-studio-api";

type Props = {
  title: string;
  fields: FieldDef[];
  initial: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
};

type Option = { value: string; label: string };

function SelectField({
  field, value, onChange, inputStyle,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  inputStyle: React.CSSProperties;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (field.loadOptions) {
      setLoading(true);
      field.loadOptions()
        .then(setOptions)
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    } else {
      setOptions((field.options ?? []).map((o) => ({ value: o, label: o })));
    }
  }, [field]);

  return (
    <select
      value={loading ? "" : String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
      disabled={loading}
    >
      <option value="">--</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function toJsonEditorValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeValuesForSave(fields: FieldDef[], values: Record<string, unknown>) {
  const normalized = { ...values };
  for (const field of fields) {
    if (field.hidden || field.type !== "json") continue;
    const raw = normalized[field.name];
    if (raw === null || raw === undefined || raw === "") {
      normalized[field.name] = field.required ? undefined : null;
      continue;
    }
    if (typeof raw === "string") {
      try {
        normalized[field.name] = JSON.parse(raw);
      } catch {
        throw new Error(`${field.label} must be valid JSON.`);
      }
    }
  }
  return normalized;
}

export function MetadataFormDialog({ title, fields, initial, onSave, onClose }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = fields.filter((f) => !f.hidden);

  const set = (name: string, val: unknown) => setValues((prev) => ({ ...prev, [name]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const normalized = normalizeValuesForSave(fields, values);
      await onSave(normalized);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    fontSize: "var(--font-size-sm)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    background: "var(--bg)",
    color: "var(--fg)",
    boxSizing: "border-box",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "110px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    lineHeight: 1.4,
    resize: "vertical",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card"
        style={{
          width: "90%",
          maxWidth: "680px",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "var(--card-padding)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="logout" onClick={onClose} style={{ padding: "4px", background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}>
            &times;
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px", background: "#fff5f5", border: "1px solid #feb2b2", borderRadius: "4px", marginBottom: "16px" }}>
            <p style={{ color: "#c53030", fontSize: "var(--font-size-sm)", margin: 0, fontWeight: 500 }}>
              {error}
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
          {visible.map((f) => (
            <div key={f.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                {f.label}
                {f.required && <span style={{ color: "var(--danger)" }}>*</span>}
              </span>
              {f.type === "boolean" ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
                  <input
                    type="checkbox"
                    id={`field-${f.name}`}
                    checked={!!values[f.name]}
                    onChange={(e) => set(f.name, e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label htmlFor={`field-${f.name}`} style={{ fontSize: "var(--font-size-sm)", cursor: "pointer" }}>
                    {values[f.name] ? "Enabled" : "Disabled"}
                  </label>
                </div>
              ) : f.type === "number" ? (
                <input
                  type="number"
                  value={String(values[f.name] ?? "")}
                  onChange={(e) => set(f.name, e.target.value ? Number(e.target.value) : null)}
                  style={inputStyle}
                />
              ) : f.type === "select" ? (
                <SelectField
                  field={f}
                  value={String(values[f.name] ?? "")}
                  onChange={(v) => set(f.name, v)}
                  inputStyle={inputStyle}
                />
              ) : f.type === "json" ? (
                <>
                  <textarea
                    value={toJsonEditorValue(values[f.name])}
                    onChange={(e) => set(f.name, e.target.value)}
                    style={textareaStyle}
                    placeholder="Enter valid JSON"
                    spellCheck={false}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "ui-monospace, monospace", textTransform: "uppercase" }}>
                      Valid JSON required
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                      {String(values[f.name] ?? "").length} characters
                    </span>
                  </div>
                </>
              ) : (
                <input
                  type="text"
                  value={String(values[f.name] ?? "")}
                  onChange={(e) => set(f.name, e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
          <button
            className="logout"
            onClick={onClose}
            disabled={saving}
            style={{ padding: "8px 18px", fontSize: "var(--font-size-sm)", cursor: "pointer", borderRadius: "4px" }}
          >
            Cancel
          </button>
          <button
            className="btn"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "8px 18px", fontSize: "var(--font-size-sm)", cursor: "pointer", borderRadius: "4px", fontWeight: 600 }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
