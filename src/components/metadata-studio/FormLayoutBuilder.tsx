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
  id: string; // Stable ID for React keys
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
    id: crypto.randomUUID(),
    section: index === 0 ? "Basic Info" : `Section ${index + 1}`,
    columns: 1,
    fields: [],
  };
}

type Props = {
  initialDocTypeKey?: string;
  onNavigate?: (itemKey: string) => void;
};

export function FormLayoutBuilder({ initialDocTypeKey = "", onNavigate }: Props) {
  const [docTypes, setDocTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [availableFields, setAvailableFields] = useState<FieldOption[]>([]);
  const [sections, setSections] = useState<LayoutSection[]>([makeSection(0)]);
  const [fieldSearch, setFieldSearch] = useState("");
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
          id: String(section.id || crypto.randomUUID()),
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
        const first = rows.find((row) => row.value === initialDocTypeKey)?.value ?? (initialDocTypeKey || rows[0]?.value || "");
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
    const query = fieldSearch.toLowerCase().trim();
    return availableFields
      .filter((field) => !assignedFieldnames.has(field.fieldname) || sections[index]?.fields.includes(field.fieldname))
      .filter((field) => !query || field.label.toLowerCase().includes(query) || field.fieldname.toLowerCase().includes(query));
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
    <div className="studio-shell">
      <div className="studio-header">
        <div>
          <p className="studio-kicker">Form Experience</p>
          <h3>Form Layout Builder</h3>
          <p>
            Build sections and field placement visually without editing layout JSON.
          </p>
        </div>
        <div className="studio-toolbar">
          <select
            className="studio-control"
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
          <button className="studio-button" type="button" onClick={() => setSections((prev) => [...prev, makeSection(prev.length)])}>
            Add Section
          </button>
        </div>
      </div>

      {loading ? (
        <div className="state-info">Loading Form Layout Builder…</div>
      ) : (
        <>
          <div className="studio-stack">
            {sections.map((section, index) => (
              <div key={section.id} className="studio-panel">
                <div className="studio-header">
                  <div className="studio-grid" style={{ gridTemplateColumns: "minmax(180px, 1.5fr) 140px", flex: 1 }}>
                    <label className="studio-field">
                      <span>Section Name</span>
                      <input value={section.section} onChange={(event) => updateSection(index, { section: event.target.value })} />
                    </label>
                    <label className="studio-field">
                      <span>Columns</span>
                      <select value={section.columns} onChange={(event) => updateSection(index, { columns: Number(event.target.value) === 2 ? 2 : 1 })}>
                        <option value={1}>1 column</option>
                        <option value={2}>2 columns</option>
                      </select>
                    </label>
                  </div>
                  <div className="studio-toolbar" style={{ alignItems: "end" }}>
                    <button className="studio-button studio-button--ghost" type="button" onClick={() => setSections((prev) => moveItem(prev, index, -1))}>Up</button>
                    <button className="studio-button studio-button--ghost" type="button" onClick={() => setSections((prev) => moveItem(prev, index, 1))}>Down</button>
                    <button className="studio-button studio-button--danger" type="button" onClick={() => setSections((prev) => prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index))}>
                      Remove
                    </button>
                  </div>
                </div>

                <div className="studio-grid studio-grid--two">
                  <div className="studio-panel studio-panel--muted">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <strong>Assign Fields</strong>
                      <input 
                        className="studio-control"
                        style={{ fontSize: "11px", padding: "2px 6px", height: "24px", width: "140px" }}
                        placeholder="Search fields..."
                        value={fieldSearch}
                        onChange={(e) => setFieldSearch(e.target.value)}
                      />
                    </div>
                    <div className="studio-item-list">
                      {unassignedFieldsFor(index).map((field) => (
                        <label key={`${section.id}-${field.fieldname}`} className="studio-check">
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
                      {unassignedFieldsFor(index).length === 0 && (
                        <div className="studio-hint" style={{ textAlign: "center", padding: "10px" }}>
                          {fieldSearch ? "No fields match your search." : "All fields assigned."}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="studio-panel">
                    <strong>Section Fields</strong>
                    <div className="studio-item-list">
                      {section.fields.length === 0 ? (
                        <div className="studio-hint">No fields assigned yet. Use “Assign Fields” to place the first identifier and the most important business fields into this section.</div>
                      ) : (
                        section.fields.map((fieldname, fieldIndex) => {
                          const meta = availableFields.find((field) => field.fieldname === fieldname);
                          return (
                            <div key={`${section.id}-assigned-${fieldname}`} className="studio-item">
                              <div>
                                <div>{meta?.label ?? fieldname}</div>
                                <code>{fieldname}</code>
                              </div>
                              <div className="studio-toolbar">
                                <button className="studio-button studio-button--ghost" type="button" onClick={() => updateSection(index, { fields: moveItem(section.fields, fieldIndex, -1) })}>Up</button>
                                <button className="studio-button studio-button--ghost" type="button" onClick={() => updateSection(index, { fields: moveItem(section.fields, fieldIndex, 1) })}>Down</button>
                                <button className="studio-button studio-button--danger" type="button" onClick={() => updateSection(index, { fields: section.fields.filter((value) => value !== fieldname) })}>Remove</button>
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

          <div className="studio-preview">
            <div className="studio-preview-head">Preview Form</div>
            <div className="studio-stack" style={{ padding: "12px" }}>
              {sections.map((section) => (
                <div key={`preview-${section.id}`} className="studio-panel studio-panel--muted">
                  <div style={{ marginBottom: "10px", fontWeight: 700 }}>{section.section}</div>
                  <div style={{ display: "grid", gridTemplateColumns: section.columns === 2 ? "repeat(2, minmax(0, 1fr))" : "1fr", gap: "10px" }}>
                    {section.fields.map((fieldname) => {
                      const meta = availableFields.find((field) => field.fieldname === fieldname);
                      return (
                        <label key={`preview-${section.id}-${fieldname}`} className="studio-field">
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

          <div className="studio-actions" style={{ justifyContent: "flex-end" }}>
            <div className="studio-toolbar">
              {selectedDocType && (
                <button className="studio-button studio-button--ghost" type="button" onClick={() => onNavigate?.("metadata_studio_workspace_menu_builder")}>
                  Next: Menu
                </button>
              )}
              <button className="studio-button" type="button" onClick={handleSave} disabled={saving || !selectedDocType}>
                {saving ? "Saving..." : "Save Form Layout"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
