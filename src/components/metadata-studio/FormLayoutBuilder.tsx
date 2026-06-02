import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createRecord,
  getDefaultFormLayoutRecord,
  listDocFieldsForDoctype,
  loadDocTypeKeys,
  updateRecord,
} from "../../lib/metadata/metadata-studio-api";
import { moveItem } from "./builder-utils";

type LayoutSection = {
  section: string;
  columns: 1 | 2;
  fields: string[];
};

type FieldOption = {
  fieldname: string;
  label: string;
  fieldtype: string;
};

function makeSection(index: number): LayoutSection {
  return {
    section: index === 0 ? "Basic Info" : `Section ${index + 1}`,
    columns: 1,
    fields: [],
  };
}

export function FormLayoutBuilder() {
  const [docTypes, setDocTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [availableFields, setAvailableFields] = useState<FieldOption[]>([]);
  const [sections, setSections] = useState<LayoutSection[]>([makeSection(0)]);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadBuilderState(doctypeKey: string) {
    if (!doctypeKey) {
      setAvailableFields([]);
      setSections([makeSection(0)]);
      setExistingId(null);
      return;
    }

    const [fieldRows, layout] = await Promise.all([
      listDocFieldsForDoctype(doctypeKey),
      getDefaultFormLayoutRecord(doctypeKey),
    ]);

    setAvailableFields(fieldRows
      .filter((row) => !row.is_hidden)
      .map((row) => ({
        fieldname: String(row.fieldname),
        label: String(row.label ?? row.fieldname),
        fieldtype: String(row.fieldtype ?? "Data"),
      })));

    const nextSections = Array.isArray(layout?.sections_json) && layout.sections_json.length > 0
      ? (layout.sections_json as Array<Record<string, unknown>>).map((section, index) => ({
          section: String(section.section ?? `Section ${index + 1}`),
          columns: Number(section.columns ?? 1) === 2 ? 2 : 1,
          fields: Array.isArray(section.fields) ? section.fields.map((field) => String(field)) : [],
        }) as LayoutSection)
      : [makeSection(0)];

    setSections(nextSections);
    setExistingId(layout?.id ? String(layout.id) : null);
  }

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      try {
        const rows = await loadDocTypeKeys();
        if (cancelled) return;
        setDocTypes(rows);
        const first = rows[0]?.value ?? "";
        setSelectedDocType(first);
        await loadBuilderState(first);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load Form Layout Builder");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const assignedFieldnames = useMemo(
    () => new Set(sections.flatMap((section) => section.fields)),
    [sections],
  );

  function updateSection(index: number, updates: Partial<LayoutSection>) {
    setSections((prev) => prev.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...updates } : section));
  }

  function unassignedFieldsFor(index: number) {
    return availableFields.filter((field) => !assignedFieldnames.has(field.fieldname) || sections[index]?.fields.includes(field.fieldname));
  }

  async function handleSave() {
    if (!selectedDocType) {
      toast.error("Select a DocType first.");
      return;
    }

    const hasFields = sections.some((section) => section.fields.length > 0);
    if (!hasFields) {
      toast.error("Assign at least one field to the layout.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        doctype_key: selectedDocType,
        layout_key: "default",
        label: "Default",
        sections_json: sections,
        is_default: true,
      };

      if (existingId) {
        await updateRecord("form_layouts", existingId, payload);
      } else {
        await createRecord("form_layouts", payload);
      }

      toast.success(`Saved Form Layout for ${selectedDocType}`);
      await loadBuilderState(selectedDocType);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save Form Layout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: "var(--card-padding)", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>Form Layout Builder</h3>
          <p style={{ margin: "4px 0 0", fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>
            Build sections and field placement visually without editing layout JSON.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select
            value={selectedDocType}
            onChange={async (event) => {
              const doctypeKey = event.target.value;
              setSelectedDocType(doctypeKey);
              await loadBuilderState(doctypeKey);
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
          <button className="btn" type="button" onClick={() => setSections((prev) => [...prev, makeSection(prev.length)])}>
            Add Section
          </button>
        </div>
      </div>

      {loading ? (
        <div className="state-info">Loading Form Layout Builder…</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sections.map((section, index) => (
              <div key={`${section.section}-${index}`} style={{ border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1.5fr) 140px", gap: "10px", flex: 1 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span>Section Name</span>
                      <input value={section.section} onChange={(event) => updateSection(index, { section: event.target.value })} />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span>Columns</span>
                      <select value={section.columns} onChange={(event) => updateSection(index, { columns: Number(event.target.value) === 2 ? 2 : 1 })}>
                        <option value={1}>1 column</option>
                        <option value={2}>2 columns</option>
                      </select>
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "end" }}>
                    <button className="logout" type="button" onClick={() => setSections((prev) => moveItem(prev, index, -1))}>Up</button>
                    <button className="logout" type="button" onClick={() => setSections((prev) => moveItem(prev, index, 1))}>Down</button>
                    <button className="logout" type="button" onClick={() => setSections((prev) => prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index))} style={{ color: "var(--danger)" }}>
                      Remove
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(280px, 1.6fr)", gap: "12px" }}>
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)", padding: "10px" }}>
                    <strong style={{ display: "block", marginBottom: "8px" }}>Assign Fields</strong>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {unassignedFieldsFor(index).map((field) => (
                        <label key={`${section.section}-${field.fieldname}`} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="checkbox"
                            checked={section.fields.includes(field.fieldname)}
                            onChange={(event) => updateSection(index, {
                              fields: event.target.checked
                                ? [...section.fields, field.fieldname]
                                : section.fields.filter((value) => value !== field.fieldname),
                            })}
                          />
                          <span>{field.label}</span>
                          <code style={{ marginLeft: "auto" }}>{field.fieldtype}</code>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)", padding: "10px" }}>
                    <strong style={{ display: "block", marginBottom: "8px" }}>Section Fields</strong>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {section.fields.length === 0 ? (
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>No fields assigned yet.</span>
                      ) : (
                        section.fields.map((fieldname, fieldIndex) => {
                          const meta = availableFields.find((field) => field.fieldname === fieldname);
                          return (
                            <div key={`${fieldname}-${fieldIndex}`} style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                              <div>
                                <div>{meta?.label ?? fieldname}</div>
                                <code style={{ fontSize: "10px", color: "var(--muted)" }}>{fieldname}</code>
                              </div>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button className="logout" type="button" onClick={() => updateSection(index, { fields: moveItem(section.fields, fieldIndex, -1) })}>Up</button>
                                <button className="logout" type="button" onClick={() => updateSection(index, { fields: moveItem(section.fields, fieldIndex, 1) })}>Down</button>
                                <button className="logout" type="button" onClick={() => updateSection(index, { fields: section.fields.filter((value) => value !== fieldname) })} style={{ color: "var(--danger)" }}>Remove</button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)", padding: "12px" }}>
            <strong style={{ display: "block", marginBottom: "10px" }}>Preview Form</strong>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {sections.map((section) => (
                <div key={`preview-${section.section}`} style={{ border: "1px solid #e9eef2", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ marginBottom: "10px", fontWeight: 700 }}>{section.section}</div>
                  <div style={{ display: "grid", gridTemplateColumns: section.columns === 2 ? "repeat(2, minmax(0, 1fr))" : "1fr", gap: "10px" }}>
                    {section.fields.map((fieldname) => {
                      const meta = availableFields.find((field) => field.fieldname === fieldname);
                      return (
                        <label key={`preview-${fieldname}`} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span>{meta?.label ?? fieldname}</span>
                          <input value="" readOnly placeholder={fieldname} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn" type="button" onClick={handleSave} disabled={saving || !selectedDocType}>
              {saving ? "Saving..." : "Save Form Layout"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
