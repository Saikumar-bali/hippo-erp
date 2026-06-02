import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createRecord,
  getDefaultListViewRecord,
  listDocFieldsForDoctype,
  loadDocTypeKeys,
  updateRecord,
} from "../../lib/metadata/metadata-studio-api";
import { moveItem } from "./builder-utils";

type BuilderColumn = {
  fieldname: string;
  label: string;
  width: number;
};

type FieldRow = {
  fieldname: string;
  label: string;
  fieldtype: string;
  is_hidden: boolean;
  in_list_view: boolean;
  in_standard_filter: boolean;
  options?: Record<string, unknown> | null;
};

function defaultColumn(field: FieldRow): BuilderColumn {
  return {
    fieldname: field.fieldname,
    label: field.label,
    width: field.fieldtype === "Text" ? 260 : 160,
  };
}

function buildFilter(field: FieldRow) {
  const base = {
    fieldname: field.fieldname,
    label: field.label,
  };

  if (field.fieldtype === "Select") {
    return {
      ...base,
      type: "select",
      options: Array.isArray(field.options?.options) ? field.options?.options as string[] : [],
    };
  }

  if (field.fieldtype === "Check") {
    return {
      ...base,
      type: "select",
      options: ["true", "false"],
    };
  }

  if (field.fieldtype === "Date" || field.fieldtype === "Datetime") {
    return { ...base, type: "date" };
  }

  if (field.fieldtype === "Link") {
    return {
      ...base,
      type: "link",
      doctype: typeof field.options?.link_to === "string" ? field.options.link_to : undefined,
    };
  }

  if (field.fieldtype === "Float" || field.fieldtype === "Int") {
    return { ...base, type: "number" };
  }

  return { ...base, type: "text" };
}

type Props = {
  initialDocTypeKey?: string;
  onNavigate?: (itemKey: string) => void;
};

export function ListViewBuilder({ initialDocTypeKey = "", onNavigate }: Props) {
  const [docTypes, setDocTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [availableFields, setAvailableFields] = useState<FieldRow[]>([]);
  const [columns, setColumns] = useState<BuilderColumn[]>([]);
  const [searchFields, setSearchFields] = useState<string[]>([]);
  const [filterFields, setFilterFields] = useState<string[]>([]);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadBuilderState(doctypeKey: string) {
    if (!doctypeKey) {
      setAvailableFields([]);
      setColumns([]);
      setSearchFields([]);
      setFilterFields([]);
      setExistingId(null);
      return;
    }

    const [fieldRows, listView] = await Promise.all([
      listDocFieldsForDoctype(doctypeKey),
      getDefaultListViewRecord(doctypeKey),
    ]);

    const nextFields = fieldRows
      .map((row) => ({
        fieldname: String(row.fieldname),
        label: String(row.label ?? row.fieldname),
        fieldtype: String(row.fieldtype ?? "Data"),
        is_hidden: Boolean(row.is_hidden),
        in_list_view: Boolean(row.in_list_view),
        in_standard_filter: Boolean(row.in_standard_filter),
        options: (row.options ?? null) as Record<string, unknown> | null,
      }))
      .filter((field) => !field.is_hidden);

    setAvailableFields(nextFields);

    const rawColumns = Array.isArray(listView?.columns_json) ? listView.columns_json as Array<Record<string, unknown>> : [];
    const nextColumns = rawColumns.length > 0
      ? rawColumns.map((column) => ({
          fieldname: String(column.fieldname),
          label: String(column.label ?? column.fieldname),
          width: Number(column.width ?? 160),
        }))
      : nextFields.filter((field) => field.in_list_view).slice(0, 6).map(defaultColumn);

    setColumns(nextColumns);
    setSearchFields(Array.isArray(listView?.search_fields_json) ? listView.search_fields_json as string[] : nextFields.filter((field) => ["Data", "Text"].includes(field.fieldtype)).slice(0, 3).map((field) => field.fieldname));
    setFilterFields(Array.isArray(listView?.filters_json) ? (listView.filters_json as Array<Record<string, unknown>>).map((filter) => String(filter.fieldname)) : nextFields.filter((field) => field.in_standard_filter).map((field) => field.fieldname));
    setExistingId(listView?.id ? String(listView.id) : null);
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
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load List View Builder");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedFieldnames = useMemo(() => new Set(columns.map((column) => column.fieldname)), [columns]);
  const addableFields = useMemo(() => availableFields.filter((field) => !selectedFieldnames.has(field.fieldname)), [availableFields, selectedFieldnames]);

  async function handleSave() {
    if (!selectedDocType || columns.length === 0) {
      toast.error("Select a DocType and add at least one column.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        doctype_key: selectedDocType,
        view_key: "default",
        label: "Default",
        columns_json: columns,
        filters_json: availableFields.filter((field) => filterFields.includes(field.fieldname)).map(buildFilter),
        search_fields_json: searchFields,
        sort_json: columns[0] ? { fieldname: columns[0].fieldname, direction: "asc" } : null,
        is_default: true,
      };

      if (existingId) {
        await updateRecord("list_views", existingId, payload);
      } else {
        await createRecord("list_views", payload);
      }

      toast.success(`Saved List View for ${selectedDocType}`);
      await loadBuilderState(selectedDocType);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save List View");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="studio-shell">
      <div className="studio-header">
        <div>
          <p className="studio-kicker">List Experience</p>
          <h3>List View Builder</h3>
          <p>
            Build default list columns, search fields, and filters visually without editing JSON.
          </p>
        </div>
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
      </div>

      {loading ? (
        <div className="state-info">Loading List View Builder…</div>
      ) : (
        <>
          <div className="studio-grid studio-grid--two">
            <div className="studio-panel">
              <strong>Available Fields</strong>
              <div className="studio-item-list">
                {addableFields.length === 0 ? (
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>All visible fields are already in the list.</span>
                ) : (
                  addableFields.map((field) => (
                    <button
                      key={field.fieldname}
                      type="button"
                      className="studio-item"
                      onClick={() => setColumns((prev) => [...prev, defaultColumn(field)])}
                    >
                      <span>{field.label}</span>
                      <code>{field.fieldname}</code>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="studio-panel">
              <strong>Selected Columns</strong>
              <div className="studio-item-list">
                {columns.length === 0 ? (
                  <div className="studio-hint">Choose 4 to 8 columns for the default grid. Start with the main identifier, title/name, one date, one amount/value, and status.</div>
                ) : (
                  columns.map((column, index) => (
                    <div key={`${column.fieldname}-${index}`} className="studio-item" style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1.2fr) minmax(120px, 1.2fr) 90px auto" }}>
                      <code>{column.fieldname}</code>
                      <input className="studio-inline-input studio-table-input" value={column.label} onChange={(event) => setColumns((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
                      <input
                        className="studio-inline-input studio-table-input"
                        type="number"
                        min={80}
                        value={column.width}
                        onChange={(event) => setColumns((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, width: Number(event.target.value) || 160 } : item))}
                      />
                      <div className="studio-toolbar" style={{ justifyContent: "flex-end" }}>
                        <button className="studio-button studio-button--ghost" type="button" onClick={() => setColumns((prev) => moveItem(prev, index, -1))}>Up</button>
                        <button className="studio-button studio-button--ghost" type="button" onClick={() => setColumns((prev) => moveItem(prev, index, 1))}>Down</button>
                        <button className="studio-button studio-button--danger" type="button" onClick={() => setColumns((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="studio-grid studio-grid--two">
            <div className="studio-panel">
              <strong>Search Fields</strong>
              <div className="studio-item-list">
                {availableFields.filter((field) => ["Data", "Text"].includes(field.fieldtype)).length === 0 && (
                  <div className="studio-hint">No text-like fields are available yet. Add a `Data` or `Text` field in Field Builder if you want search to feel useful.</div>
                )}
                {availableFields.map((field) => (
                  <label key={`search-${field.fieldname}`} className="studio-check">
                    <input
                      type="checkbox"
                      checked={searchFields.includes(field.fieldname)}
                      onChange={(event) => setSearchFields((prev) => event.target.checked ? [...prev, field.fieldname] : prev.filter((value) => value !== field.fieldname))}
                    />
                    <span>{field.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="studio-panel">
              <strong>Filter Fields</strong>
              <div className="studio-item-list">
                {availableFields.map((field) => (
                  <label key={`filter-${field.fieldname}`} className="studio-check">
                    <input
                      type="checkbox"
                      checked={filterFields.includes(field.fieldname)}
                      onChange={(event) => setFilterFields((prev) => event.target.checked ? [...prev, field.fieldname] : prev.filter((value) => value !== field.fieldname))}
                    />
                    <span>{field.label}</span>
                    <code style={{ marginLeft: "auto" }}>{field.fieldtype}</code>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="studio-preview">
            <div className="studio-preview-head">
              Preview Table
            </div>
            <table className="erp-table" style={{ minWidth: "100%" }}>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.fieldname} style={{ minWidth: `${column.width}px` }}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {columns.map((column) => (
                    <td key={column.fieldname} style={{ color: "var(--muted)" }}>
                      {column.fieldname}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="studio-actions" style={{ justifyContent: "flex-end" }}>
            <div className="studio-toolbar">
              {selectedDocType && (
                <button className="studio-button studio-button--ghost" type="button" onClick={() => onNavigate?.(`metadata_studio_form_layout_builder:${selectedDocType}`)}>
                  Next: Form Layout
                </button>
              )}
              <button className="studio-button" type="button" onClick={handleSave} disabled={saving || !selectedDocType}>
                {saving ? "Saving..." : "Save List View"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
