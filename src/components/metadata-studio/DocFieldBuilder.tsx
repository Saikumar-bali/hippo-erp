import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  METADATA_STUDIO_FIELD_TYPES,
  createRecord,
  deleteRecord,
  listDocFieldsForDoctype,
  loadDocTypeKeys,
  updateRecord,
} from "../../lib/metadata/metadata-studio-api";
import { moveItem, normalizeSortOrder, toSnakeCase } from "./builder-utils";

type BuilderField = {
  id?: string;
  doctype_key: string;
  label: string;
  fieldname: string;
  fieldtype: string;
  selectOptionsText: string;
  linkTo: string;
  is_required: boolean;
  in_list_view: boolean;
  in_standard_filter: boolean;
  is_hidden: boolean;
  permlevel: number;
  sort_order: number;
};

function makeEmptyField(doctypeKey: string, sortOrder: number): BuilderField {
  return {
    doctype_key: doctypeKey,
    label: "",
    fieldname: "",
    fieldtype: "Data",
    selectOptionsText: "",
    linkTo: "",
    is_required: false,
    in_list_view: false,
    in_standard_filter: false,
    is_hidden: false,
    permlevel: 0,
    sort_order: sortOrder,
  };
}

function optionsFromRecord(record: Record<string, unknown>) {
  const options = (record.options ?? null) as Record<string, unknown> | null;
  return {
    selectOptionsText: Array.isArray(options?.options) ? (options?.options as string[]).join("\n") : "",
    linkTo: typeof options?.link_to === "string" ? options.link_to : "",
  };
}

type Props = {
  initialDocTypeKey?: string;
  onNavigate?: (itemKey: string) => void;
};

export function DocFieldBuilder({ initialDocTypeKey = "", onNavigate }: Props) {
  const [docTypes, setDocTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [fields, setFields] = useState<BuilderField[]>([]);
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadFields(doctypeKey: string) {
    if (!doctypeKey) {
      setFields([]);
      setOriginalIds([]);
      return;
    }
    const rows = await listDocFieldsForDoctype(doctypeKey);
    setFields(rows.map((row, index) => ({
      id: String(row.id),
      doctype_key: String(row.doctype_key),
      label: String(row.label ?? ""),
      fieldname: String(row.fieldname ?? ""),
      fieldtype: String(row.fieldtype ?? "Data"),
      is_required: Boolean(row.is_required),
      in_list_view: Boolean(row.in_list_view),
      in_standard_filter: Boolean(row.in_standard_filter),
      is_hidden: Boolean(row.is_hidden),
      permlevel: Number(row.permlevel ?? 0),
      sort_order: Number(row.sort_order ?? index + 1),
      ...optionsFromRecord(row),
    })));
    setOriginalIds(rows.map((row) => String(row.id)));
  }

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      try {
        const rows = await loadDocTypeKeys();
        if (cancelled) return;
        setDocTypes(rows);
        const first = rows.find((row) => row.value === initialDocTypeKey)?.value ?? (initialDocTypeKey || rows[0]?.value || "");
        setSelectedDocType(first);
        await loadFields(first);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load DocTypes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [initialDocTypeKey]);

  const availableLinkTargets = useMemo(
    () => docTypes.filter((docType) => docType.value !== selectedDocType),
    [docTypes, selectedDocType],
  );

  function updateField(index: number, updates: Partial<BuilderField>) {
    setFields((prev) => prev.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...updates } : field)));
  }

  function addField() {
    if (!selectedDocType) {
      toast.error("Select a DocType first.");
      return;
    }
    setFields((prev) => [
      ...prev,
      makeEmptyField(selectedDocType, prev.length + 1),
    ]);
  }

  function removeField(index: number) {
    setFields((prev) => normalizeSortOrder(prev.filter((_, fieldIndex) => fieldIndex !== index)));
  }

  async function handleSave() {
    if (!selectedDocType) {
      toast.error("Select a DocType first.");
      return;
    }

    const duplicateFieldnames = new Set<string>();
    const seen = new Set<string>();
    for (const field of fields) {
      if (!field.label.trim() || !field.fieldname.trim()) {
        toast.error("Every field needs a label and fieldname.");
        return;
      }
      if (seen.has(field.fieldname)) duplicateFieldnames.add(field.fieldname);
      seen.add(field.fieldname);
    }
    if (duplicateFieldnames.size > 0) {
      toast.error(`Duplicate fieldnames: ${Array.from(duplicateFieldnames).join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      const nextFields = normalizeSortOrder(fields);
      const currentIds = nextFields.filter((field) => field.id).map((field) => String(field.id));
      const removedIds = originalIds.filter((id) => !currentIds.includes(id));

      for (const field of nextFields) {
        const options =
          field.fieldtype === "Select"
            ? { options: field.selectOptionsText.split("\n").map((value) => value.trim()).filter(Boolean) }
            : field.fieldtype === "Link"
              ? { link_to: field.linkTo, display_field: "name" }
              : null;

        const payload = {
          doctype_key: selectedDocType,
          fieldname: field.fieldname,
          label: field.label.trim(),
          fieldtype: field.fieldtype,
          db_column: null,
          options,
          is_required: field.is_required,
          is_unique: false,
          is_readonly: false,
          is_hidden: field.is_hidden,
          in_list_view: field.in_list_view,
          in_standard_filter: field.in_standard_filter,
          permlevel: field.permlevel,
          default_value: null,
          validation_rules: null,
          depends_on: null,
          sort_order: field.sort_order,
        };

        if (field.id) {
          await updateRecord("docfields", field.id, payload);
        } else {
          await createRecord("docfields", payload);
        }
      }

      for (const removedId of removedIds) {
        await deleteRecord("docfields", removedId);
      }

      toast.success(`Saved ${nextFields.length} field${nextFields.length === 1 ? "" : "s"}`);
      await loadFields(selectedDocType);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save fields");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="studio-shell">
      <div className="studio-header">
        <div>
          <p className="studio-kicker">Schema Design</p>
          <h3>Field Builder</h3>
          <p>
            Add, edit, and reorder fields with dropdowns for field type and link targets.
          </p>
        </div>
        <div className="studio-toolbar">
          <select
            className="studio-control"
            value={selectedDocType}
            onChange={async (event) => {
              const doctypeKey = event.target.value;
              setSelectedDocType(doctypeKey);
              await loadFields(doctypeKey);
            }}
            style={{ minWidth: "280px" }}
          >
            <option value="">Select DocType</option>
            {docTypes.map((docType) => (
              <option key={docType.value} value={docType.value}>
                {docType.label}
              </option>
            ))}
          </select>
          <button className="studio-button" type="button" onClick={addField}>
            Add Field
          </button>
        </div>
      </div>

      {loading ? (
        <div className="state-info">Loading Field Builder…</div>
      ) : fields.length === 0 ? (
        <div className="studio-hint">
          No fields yet. Start with 4 core fields: a title or document number, a primary party name, a date, and an active/status field. Then mark the ones that belong in list view and filters.
        </div>
      ) : (
        <div className="studio-stack">
          {fields.map((field, index) => (
            <div key={field.id ?? `${field.fieldname}-${index}`} className="studio-panel">
              <div className="studio-header" style={{ alignItems: "center" }}>
                <strong>Field {index + 1}</strong>
                <div className="studio-toolbar">
                  <button className="studio-button" type="button" onClick={() => setFields((prev) => normalizeSortOrder(moveItem(prev, index, -1)))} style={{ padding: "5px 12px", fontSize: "14px", fontWeight: "500", backgroundColor: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>Up</button>
                  <button className="studio-button studio-button--ghost" type="button" onClick={() => setFields((prev) => normalizeSortOrder(moveItem(prev, index, 1)))} style={{ padding: "5px 12px", fontSize: "14px", fontWeight: "500", backgroundColor: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>Down</button>
                  <button className="studio-button studio-button--danger" type="button" onClick={() => removeField(index)} style={{ padding: "5px 12px", fontSize: "14px", fontWeight: "500", backgroundColor: "#ffffff", color: "#e03131", border: "1px solid #ffc9c9", borderRadius: "6px", cursor: "pointer" }}>Remove</button>
                </div>
              </div>

              <div className="studio-form-columns">
                <label className="studio-field">
                  <span>Label</span>
                  <input
                    value={field.label}
                    onChange={(event) => {
                      const label = event.target.value;
                      updateField(index, {
                        label,
                        fieldname: field.fieldname ? field.fieldname : toSnakeCase(label),
                      });
                    }}
                  />
                </label>
                <label className="studio-field">
                  <span>Fieldname</span>
                  <input
                    value={field.fieldname}
                    onChange={(event) => updateField(index, { fieldname: toSnakeCase(event.target.value) })}
                    placeholder="invoice_number"
                  />
                </label>
                <label className="studio-field">
                  <span>Field Type</span>
                  <select value={field.fieldtype} onChange={(event) => updateField(index, { fieldtype: event.target.value, selectOptionsText: "", linkTo: "" })}>
                    {METADATA_STUDIO_FIELD_TYPES.map((fieldType) => (
                      <option key={fieldType} value={fieldType}>
                        {fieldType}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="studio-field">
                  <span>Permission Level</span>
                  <select
                    value={String(field.permlevel)}
                    onChange={(event) => updateField(index, { permlevel: Number(event.target.value) })}
                  >
                    <option value="0">Level 0 - Normal</option>
                    <option value="1">Level 1 - Sensitive</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                  </select>
                </label>
              </div>

              {field.fieldtype === "Select" && (
                <label className="studio-field">
                  <span>Select Options</span>
                  <textarea
                    value={field.selectOptionsText}
                    onChange={(event) => updateField(index, { selectOptionsText: event.target.value })}
                    placeholder={"Draft\nSubmitted\nCancelled"}
                    style={{ minHeight: "84px", resize: "vertical" }}
                  />
                </label>
              )}

              {field.fieldtype === "Link" && (
                <label className="studio-field">
                  <span>Link DocType</span>
                  <select value={field.linkTo} onChange={(event) => updateField(index, { linkTo: event.target.value })}>
                    <option value="">Select linked DocType</option>
                    {availableLinkTargets.map((docType) => (
                      <option key={docType.value} value={docType.value}>
                        {docType.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="studio-checkbox-row">
                <label className="studio-check">
                  <input type="checkbox" checked={field.is_required} onChange={(event) => updateField(index, { is_required: event.target.checked })} />
                  Required
                </label>
                <label className="studio-check">
                  <input type="checkbox" checked={field.in_list_view} onChange={(event) => updateField(index, { in_list_view: event.target.checked })} />
                  In List View
                </label>
                <label className="studio-check">
                  <input type="checkbox" checked={field.in_standard_filter} onChange={(event) => updateField(index, { in_standard_filter: event.target.checked })} />
                  In Filter
                </label>
                <label className="studio-check">
                  <input type="checkbox" checked={field.is_hidden} onChange={(event) => updateField(index, { is_hidden: event.target.checked })} />
                  Hidden
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="studio-actions">
        <span className="studio-subtle">
          Supported types: {METADATA_STUDIO_FIELD_TYPES.join(", ")}
        </span>
        <div className="studio-toolbar">
          {selectedDocType && (
            <button className="studio-button" type="button" onClick={() => onNavigate?.(`metadata_studio_list_view_builder:${selectedDocType}`)} style={{ padding: "8px 16px", fontSize: "14px", fontWeight: "600", backgroundColor: "#006666", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Next: List View</button>
          )}
          <button className="studio-button" type="button" onClick={handleSave} disabled={saving || !selectedDocType}>
            {saving ? "Saving..." : "Save Fields"}
          </button>
        </div>
      </div>
    </div>
  );
}
