import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDocTypeConfig } from "../../lib/metadata/doctype-registry";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";
import { DynamicFilterBar } from "./DynamicFilterBar";
import { DynamicActionBar } from "./DynamicActionBar";
import { DynamicDetailPage } from "./DynamicDetailPage";
import { StatusField } from "./StatusField";
import { getDocTypeApi } from "./doctype-api-map";
import { DynamicFormPage } from "./DynamicFormPage";
import type { DocFieldMeta, ListViewColumn } from "../../lib/metadata/types";

type Props = {
  doctypeKey: string;
  tenantId: string;
  canUpdate: boolean;
  canDelete: boolean;
  permissionChecker: (key: string) => boolean;
};

export function DynamicListPage({
  doctypeKey,
  tenantId,
  canUpdate,
  canDelete,
  permissionChecker,
}: Props) {
  const { config, loading: metaLoading, error: metaError } = useDocTypeConfig(doctypeKey);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [linkLabels, setLinkLabels] = useState<Record<string, Record<string, string>>>({});
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const api = useMemo(() => getDocTypeApi(doctypeKey), [doctypeKey]);

  const loadAll = useMemo(() => async () => {
    if (!api) return;
    setDataLoading(true);
    setError("");
    try {
      const data = await api.list(tenantId);
      setRecords(data as Record<string, unknown>[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      setError(msg);
      toast.error(msg);
    } finally {
      setDataLoading(false);
    }
  }, [api, tenantId]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!api || records.length === 0 || !config) return;
    const linkFields = config.fields.filter((f) => f.fieldtype === "Link");
    if (linkFields.length === 0) return;

    const loadAllLabels = async () => {
      const allLabels: Record<string, Record<string, string>> = {};
      for (const lf of linkFields) {
        const opts = lf.options as Record<string, unknown>;
        const linkTo = opts?.link_to as string | undefined;
        if (!linkTo) continue;
        const displayFields = opts?.display_fields as string[] | undefined;
        const displayTemplate = opts?.display_template as string | undefined;
        const displayField = opts?.display_field as string ?? "name";
        const linkApi = getDocTypeApi(linkTo);
        if (!linkApi?.list) continue;
        try {
          const linkedRecords = await linkApi.list(tenantId) as Record<string, unknown>[];
          const map: Record<string, string> = {};
          for (const lr of linkedRecords) {
            if (displayTemplate && displayFields) {
              let label = displayTemplate;
              for (const df of displayFields) {
                label = label.replace(`{${df}}`, String(lr[df] ?? ""));
              }
              map[lr.id as string] = label;
            } else {
              map[lr.id as string] = String(lr[displayField] ?? lr.id);
            }
          }
          allLabels[lf.fieldname] = map;
        } catch {
          allLabels[lf.fieldname] = {};
        }
      }
      setLinkLabels(allLabels);
    };
    void loadAllLabels();
  }, [api, records, config, tenantId]);

  const listView = config?.listView;
  const columns = useMemo(() => listView?.columns_json ?? [] as ListViewColumn[], [listView?.columns_json]);
  const filterConfig = useMemo(() => listView?.filters_json ?? [], [listView?.filters_json]);
  const searchFields = useMemo(() => listView?.search_fields_json ?? [] as string[], [listView?.search_fields_json]);
  const actions = config?.actions ?? [];

  const hasStatusColumn = columns.some((c) => c.fieldname === "is_active");

  const clickableColumns = (() => {
    const priority = ["sku", "code", "name", "title", "label"];
    for (const p of priority) {
      if (columns.some((c) => c.fieldname === p)) return new Set([p]);
    }
    return new Set<string>();
  })();

  const fieldMap = useMemo(() => {
    const m = new Map<string, DocFieldMeta>();
    if (config) for (const f of config.fields) m.set(f.fieldname, f);
    return m;
  }, [config]);

  const filtered = useMemo(() => {
    let list = records;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        searchFields.some((sf) => String(r[sf] ?? "").toLowerCase().includes(q))
      );
    }
    for (const [fname, fval] of Object.entries(filterValues)) {
      if (fval !== "all") {
        if (fname === "is_active") {
          list = list.filter((r) => String(r[fname]) === fval);
        } else {
          list = list.filter((r) => String(r[fname]) === fval);
        }
      }
    }
    return list;
  }, [records, search, filterValues, searchFields]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length]);
  const paginated = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId]
  );

  const renderCell = (field: DocFieldMeta, record: Record<string, unknown>) => {
    const value = record[field.fieldname];
    const fieldLinkLabels = linkLabels[field.fieldname] ?? {};
    if (field.fieldtype === "Link") {
      const fkValue = value as string | undefined;
      const display = fkValue ? fieldLinkLabels[fkValue] ?? fkValue : null;
      return <DynamicFieldRenderer field={field} value={display} />;
    }
    return <DynamicFieldRenderer field={field} value={value} />;
  };

  const handleAction = (actionKey: string) => {
    if (actionKey === "create") setCreating(true);
    if (actionKey === "deactivate" && selectedId) {
      api?.deactivate?.(selectedId)
        .then(() => { toast.success("Deactivated"); setSelectedId(null); void loadAll(); })
        .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to deactivate"));
    }
  };

  if (metaLoading || dataLoading) {
    return <div className="card state-info">Loading {doctypeKey} list…</div>;
  }

  if (metaError) return <div className="card state-error">{metaError}</div>;
  if (!config) return <div className="card state-error">Unknown DocType: {doctypeKey}</div>;
  if (error) return <div className="card state-error">{error}</div>;

  if (creating) {
    return (
      <DynamicFormPage
        doctypeKey={doctypeKey}
        tenantId={tenantId}
        onSaved={() => { setCreating(false); void loadAll(); }}
        onCancel={() => setCreating(false)}
        action="create"
      />
    );
  }

  if (selectedRecord && editingId) {
    return (
      <DynamicFormPage
        doctypeKey={doctypeKey}
        tenantId={tenantId}
        recordId={editingId}
        onSaved={() => { setEditingId(null); setSelectedId(null); void loadAll(); }}
        onCancel={() => { setEditingId(null); }}
        action="update"
      />
    );
  }

  if (selectedRecord) {
    return (
      <DynamicDetailPage
        doctypeKey={doctypeKey}
        recordId={selectedId!}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={() => setEditingId(selectedId)}
        onClose={() => setSelectedId(null)}
        onDeactivate={() => handleAction("deactivate")}
        onReactivate={() => {
          api?.reactivate?.(selectedId!)
            .then(() => { toast.success("Reactivated"); setSelectedId(null); void loadAll(); })
            .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to reactivate"));
        }}
      />
    );
  }

  const getRowKey = (r: Record<string, unknown>) => String(r.id ?? "");

  return (
    <div className="module-stack">
      <div className="card">
        <div className="card-head">
          <h3>{config.doctype.label}</h3>
          <DynamicActionBar
            actions={actions}
            permissionChecker={permissionChecker}
            onAction={handleAction}
          />
        </div>

        {filterConfig.length > 0 && (
          <DynamicFilterBar
            filters={filterConfig}
            searchFields={searchFields}
            search={search}
            onSearchChange={setSearch}
            filterValues={filterValues}
            onFilterChange={(fn, fv) => setFilterValues((prev) => ({ ...prev, [fn]: fv }))}
          />
        )}

        {filtered.length === 0 ? (
          <div className="empty-state">
            <strong>{records.length === 0 ? `No ${config.doctype.label.toLowerCase()} records yet.` : "No records match the current filters."}</strong>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.fieldname} style={col.width ? { width: col.width } : undefined}>
                      {col.label}
                    </th>
                  ))}
                  {!hasStatusColumn && <th>Status</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((record) => (
                  <tr key={getRowKey(record)}>
                    {columns.map((col) => {
                      const field = fieldMap.get(col.fieldname);
                      if (!field) return <td key={col.fieldname}>—</td>;
                      return (
                        <td key={col.fieldname}>
                          {clickableColumns.has(col.fieldname) ? (
                            <button className="link-button" onClick={() => setSelectedId(record.id as string)}>
                              {renderCell(field, record)}
                            </button>
                          ) : (
                            renderCell(field, record)
                          )}
                        </td>
                      );
                    })}
                    {!hasStatusColumn && (
                      <td>
                        <StatusField value={record.is_active as boolean} />
                      </td>
                    )}
                    <td>
                      <div className="action-group">
                        <button className="logout" onClick={() => setSelectedId(record.id as string)}>View</button>
                        {canUpdate && (record.is_active as boolean) && (
                          <button className="logout" onClick={() => { setSelectedId(record.id as string); setEditingId(record.id as string); }}>Edit</button>
                        )}
                        {canDelete && (record.is_active as boolean) && (
                          <button className="logout logout--danger" onClick={() => {
                            api?.deactivate?.(record.id as string)
                              .then(() => { toast.success("Deactivated"); void loadAll(); })
                              .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Failed"));
                          }}>Deactivate</button>
                        )}
                        {canUpdate && !(record.is_active as boolean) && (
                          <button className="logout" onClick={() => {
                            api?.reactivate?.(record.id as string)
                              .then(() => { toast.success("Reactivated"); void loadAll(); })
                              .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Failed"));
                          }}>Reactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
                <span className="page-info">{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
