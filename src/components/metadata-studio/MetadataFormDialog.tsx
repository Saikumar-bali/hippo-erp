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
          width: "620px", maxHeight: "82vh", overflowY: "auto",
          padding: "var(--card-padding)",
        }}
      >
        <h3 style={{ marginBottom: "12px" }}>{title}</h3>

        {error && (
          <p style={{ color: "var(--danger)", fontSize: "var(--font-size-sm)", marginBottom: "8px" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {visible.map((f) => (
            <label key={f.name} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
                {f.label}
                {f.required && <span style={{ color: "var(--danger)" }}> *</span>}
              </span>
              {f.type === "boolean" ? (
                <input
                  type="checkbox"
                  checked={!!values[f.name]}
                  onChange={(e) => set(f.name, e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
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
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    Valid JSON required
                  </span>
                </>
              ) : (
                <input
                  type="text"
                  value={String(values[f.name] ?? "")}
                  onChange={(e) => set(f.name, e.target.value)}
                  style={inputStyle}
                />
              )}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
          <button
            className="logout"
            onClick={onClose}
            disabled={saving}
            style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            className="btn"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "6px 14px", fontSize: "var(--font-size-sm)", cursor: "pointer" }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
