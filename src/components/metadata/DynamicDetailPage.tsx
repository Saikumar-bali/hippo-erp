import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDocTypeConfig } from "../../lib/metadata/doctype-registry";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";
import type { DocFieldMeta, FormLayoutSection } from "../../lib/metadata/types";
import { getDocTypeApi, detectAndRegisterGenericDocTypeApi, type DocTypeApi, type WorkflowAction } from "./doctype-api-map";
import { StatusField } from "./StatusField";
import { Printer, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useDocTypeFieldAccess } from "../../lib/metadata/use-doctype-field-access";

type AuditEvent = {
  id: string;
  action: string;
  entity_id: string;
  changes: Record<string, unknown> | null;
  user_id: string;
  created_at: string;
};

type DocVersion = {
  id: string;
  version_number: number;
  changed_by: string;
  changed_at: string;
  change_reason: string | null;
  data: Record<string, unknown>;
};

type Props = {
  doctypeKey: string;
  recordId: string;
  canUpdate: boolean;
  canDelete: boolean;
  canPrint?: boolean;
  onEdit?: () => void;
  onClose?: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
  onBack?: () => void;
  tenantId?: string;
  initialRecord?: Record<string, unknown> | null;
};

export function DynamicDetailPage({
  doctypeKey,
  recordId,
  canUpdate,
  canDelete,
  canPrint,
  onEdit,
  onClose,
  onDeactivate,
  onReactivate,
  onBack,
  tenantId,
  initialRecord,
}: Props) {
  const navigate = useNavigate();
  const { config, loading: metaLoading, error: metaError } = useDocTypeConfig(doctypeKey);
  const { readableFieldnames, permlevelByFieldname, loading: accessLoading, error: accessError } = useDocTypeFieldAccess(doctypeKey, tenantId ?? null);
  const [record, setRecord] = useState<Record<string, unknown> | null>(initialRecord ?? null);
  const [dataLoading, setDataLoading] = useState(!initialRecord);
  const [linkLabels, setLinkLabels] = useState<Record<string, string>>({});
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [selectedVersionDiff, setSelectedVersionDiff] = useState<{ from: number; to: number; diff: Record<string, unknown> } | null>(null);
  const [workflowActions, setWorkflowActions] = useState<WorkflowAction[]>([]);
  const [, setWorkflowLoading] = useState(false);

  const [registeredApi, setRegisteredApi] = useState<DocTypeApi | null>(() => getDocTypeApi(doctypeKey));
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    const existing = getDocTypeApi(doctypeKey);
    if (existing) { setRegisteredApi(existing); setApiReady(true); return; }
    let cancelled = false;
    detectAndRegisterGenericDocTypeApi(doctypeKey).then((detected) => {
      if (!cancelled) {
        if (detected) setRegisteredApi(detected);
        setApiReady(!!detected);
      }
    });
    return () => { cancelled = true; };
  }, [doctypeKey]);

  const api = registeredApi;

  useEffect(() => {
    if (!apiReady || !api || !recordId) return;
    let cancelled = false;
    setDataLoading(true);
    api.get(recordId, tenantId)
      .then((data) => {
        if (!cancelled) setRecord(data as Record<string, unknown>);
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Failed to load record");
      })
      .finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
  }, [api, recordId, apiReady, tenantId]);

  useEffect(() => {
    if (!api || !record || !config) return;
    const linkFields = config.fields.filter((f) => f.fieldtype === "Link");
    if (linkFields.length === 0) return;

    const loadLabels = async () => {
      const labels: Record<string, string> = {};
      for (const lf of linkFields) {
        const fkValue = record[lf.fieldname] as string | undefined;
        if (!fkValue) continue;
        const linkApi = getDocTypeApi((lf.options as Record<string, unknown>)?.link_to as string);
        if (!linkApi?.get) continue;
        try {
          const linked = await linkApi.get(fkValue) as Record<string, unknown>;
          const displayField = (lf.options as Record<string, unknown>)?.display_field as string ?? "name";
          labels[lf.fieldname] = String(linked[displayField] ?? fkValue);
        } catch {
          labels[lf.fieldname] = fkValue;
        }
      }
      setLinkLabels(labels);
    };
    void loadLabels();
  }, [api, record, config]);

  // Load audit events and versions for generic_json documents
  useEffect(() => {
    if (!api?.listAuditEvents || !recordId || !tenantId) return;
    let cancelled = false;
    setAuditLoading(true);

    Promise.all([
      api.listAuditEvents(recordId, tenantId),
      api.listVersions?.(recordId, tenantId) ?? Promise.resolve([]),
    ])
      .then(([events, vers]) => {
        if (!cancelled) {
          setAuditEvents(events as AuditEvent[]);
          setVersions(vers as DocVersion[]);
        }
      })
      .catch(() => {
        // Silently fail — audit is non-critical
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, recordId, tenantId]);

  // Load workflow actions for the document
  useEffect(() => {
    if (!api?.getWorkflowActions || !recordId || !tenantId) return;
    let cancelled = false;
    setWorkflowLoading(true);
    api.getWorkflowActions(recordId, tenantId)
      .then((actions) => {
        if (!cancelled) setWorkflowActions(actions);
      })
      .catch(() => {
        // Non-critical: workflow may not be configured
      })
      .finally(() => {
        if (!cancelled) setWorkflowLoading(false);
      });
    return () => { cancelled = true; };
  }, [api, recordId, tenantId]);

  if (metaLoading || dataLoading || accessLoading) {
    return <div className="card state-info">Loading {doctypeKey} details…</div>;
  }
  if (metaError) return <div className="card state-error">{metaError}</div>;
  if (accessError) return <div className="card state-error">{accessError}</div>;
  if (!config) return <div className="card state-error">Unknown DocType: {doctypeKey}</div>;
  if (!record) return <div className="card state-error">Record not found</div>;

  const layout = config.formLayout;
  const sections: FormLayoutSection[] = layout?.sections_json ?? [
    { section: "Details", columns: 2, fields: config.fields.filter((f) => !f.is_hidden).map((f) => f.fieldname) },
  ];

  const fieldMap = new Map<string, DocFieldMeta>();
  for (const f of config.fields) fieldMap.set(f.fieldname, f);

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : "—";

  const isActive = record.is_active as boolean ?? true;
  const docstatus = record.docstatus as number | undefined;
  const workflowState = record.workflow_state as string | undefined;

  const docstatusLabel = docstatus === 0 ? "Draft" : docstatus === 1 ? "Submitted" : docstatus === 2 ? "Cancelled" : null;
  const docstatusClass = docstatus === 0 ? "mini-badge--active" : docstatus === 1 ? "mini-badge--info" : "mini-badge--inactive";

  return (
    <div className="module-stack">
      <div className="detail-head">
        <div>
          <p className="eyebrow">{config.doctype.label} Detail</p>
          <h3>{(record.name ?? record.sku ?? record.code ?? "Record") as string}</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {docstatusLabel && (
            <span className={`mini-badge ${docstatusClass}`}>
              {docstatusLabel}
            </span>
          )}
          {workflowState && (
            <span className="mini-badge mini-badge--info">
              {workflowState}
            </span>
          )}
          <StatusField value={isActive} />
        </div>
      </div>

      {sections.map((sec) => (
        <div key={sec.section} className="detail-section">
          <h4 className="detail-section-title">{sec.section}</h4>
          <div className={sec.columns === 1 ? "detail-grid detail-grid--single" : "detail-grid"}>
            {sec.fields
              .map((fn) => fieldMap.get(fn))
              .filter((f): f is DocFieldMeta => f !== undefined && !f.is_hidden && readableFieldnames.has(f.fieldname))
              .map((f) => {
                const isFullWidth = f.fieldtype === "Text";
                return (
                  <div key={f.fieldname} className={isFullWidth ? "detail-field detail-field--full" : "detail-field"}>
                    <span className="detail-label">{f.label}</span>
                    <span className="detail-value">
                      {f.fieldtype === "Datetime" ? formatDate(record[f.fieldname] as string | null) :
                       f.fieldtype === "Date" ? (record[f.fieldname] ? new Date(record[f.fieldname] as string).toLocaleDateString() : "—") :
                       f.fieldtype === "uuid" && f.is_hidden ? "—" :
                       <DynamicFieldRenderer field={f} value={record[f.fieldname]} linkLabels={linkLabels} />}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Audit & Version Timeline */}
      {api?.listAuditEvents && tenantId && (auditEvents.length > 0 || versions.length > 0 || auditLoading) && (
        <div className="detail-section">
          <button
            className="detail-section-title"
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: 0, width: "100%", textAlign: "left" }}
            onClick={() => setAuditExpanded(!auditExpanded)}
          >
            <Clock size={14} />
            <span>Audit &amp; Version Timeline</span>
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>
              {auditEvents.length} event{auditEvents.length !== 1 ? "s" : ""}
            </span>
            {auditExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {auditExpanded && (
            <div style={{ marginTop: "8px" }}>
              {auditLoading && <div className="state-info">Loading audit history…</div>}
              {!auditLoading && auditEvents.length === 0 && versions.length === 0 && (
                <div className="state-info">No audit events recorded yet.</div>
              )}
              {versions.length > 1 && (
                <div style={{ marginBottom: "12px" }}>
                  <h5 style={{ fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>Version History</h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {versions.map((v, idx) => {
                      const prev = versions[idx + 1];
                      const isCurrent = idx === 0;
                      return (
                        <div
                          key={v.id}
                          style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "4px 8px", borderRadius: "4px",
                            background: isCurrent ? "var(--primary-bg, #e8f4fd)" : "transparent",
                            fontSize: "12px",
                          }}
                        >
                          <span style={{ fontWeight: 600, minWidth: "60px" }}>v{v.version_number}</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                            {new Date(v.changed_at).toLocaleString()}
                          </span>
                          {prev && api?.getVersionDiff && (
                            <button
                              style={{
                                marginLeft: "auto", background: "none", border: "1px solid var(--border, #ddd)",
                                borderRadius: "3px", padding: "1px 6px", fontSize: "10px", cursor: "pointer",
                              }}
                              onClick={async () => {
                                try {
                                  const result = await api.getVersionDiff!(recordId, prev.version_number, v.version_number, tenantId);
                                  setSelectedVersionDiff({ from: prev.version_number, to: v.version_number, diff: result.diff });
                                } catch {
                                  toast.error("Failed to load version diff");
                                }
                              }}
                            >
                              Diff v{prev.version_number}→v{v.version_number}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {selectedVersionDiff && (
                <div style={{ marginBottom: "12px", padding: "8px", background: "var(--bg-secondary, #f5f5f5)", borderRadius: "4px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong>Changes: v{selectedVersionDiff.from} → v{selectedVersionDiff.to}</strong>
                    <button
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "var(--text-muted)" }}
                      onClick={() => setSelectedVersionDiff(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {Object.entries(selectedVersionDiff.diff).map(([field, vals]) => {
                      const v = vals as { old: string | null; new: string | null };
                      const pl = permlevelByFieldname.get(field) ?? 0;
                      const masked = pl > 0;
                      return (
                        <div key={field} style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                          <span style={{ fontWeight: 600, minWidth: "120px" }}>{field}</span>
                          <span style={{ color: "#b91c1c", textDecoration: "line-through", flex: 1 }}>
                            {masked ? "•••" : (v.old ?? "—")}
                          </span>
                          <span style={{ color: "#15803d", flex: 1 }}>
                            {masked ? "•••" : (v.new ?? "—")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {auditEvents.length > 0 && (
                <div>
                  <h5 style={{ fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>Activity Log</h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {auditEvents.map((ev) => {
                      const actionLabel = ev.action === "create" ? "Created" : ev.action === "update" ? "Updated" : ev.action === "deactivate" ? "Deactivated" : ev.action === "reactivate" ? "Reactivated" : ev.action;
                      const changes = ev.changes as Record<string, unknown> | null;
                      const diff = changes?.diff as Record<string, Record<string, string>> | undefined;
                      return (
                        <div
                          key={ev.id}
                          style={{
                            display: "flex", alignItems: "baseline", gap: "8px",
                            padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                          }}
                        >
                          <span style={{
                            display: "inline-block", padding: "1px 6px", borderRadius: "3px",
                            background: ev.action === "create" ? "#dcfce7" : ev.action === "update" ? "#dbeafe" : ev.action === "deactivate" ? "#fee2e2" : "#f3f4f6",
                            fontWeight: 600, fontSize: "11px",
                          }}>
                            {actionLabel}
                          </span>
                          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                            {new Date(ev.created_at).toLocaleString()}
                          </span>
                          {diff && (
                            <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                              Changed: {Object.keys(diff).join(", ")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="form-actions">
        {workflowActions.length > 0 && (
          <div style={{ display: "flex", gap: "6px", marginRight: "auto" }}>
            {workflowActions.map((wa) => (
              <button
                key={wa.action}
                className="primary-action"
                onClick={async () => {
                  try {
                    await api?.applyWorkflowAction?.(recordId, wa.action, tenantId);
                    toast.success(`Action "${wa.action}" applied successfully`);
                    // Reload document
                    const updated = await api?.get(recordId, tenantId);
                    if (updated) setRecord(updated as Record<string, unknown>);
                    // Reload workflow actions
                    const newActions = await api?.getWorkflowActions?.(recordId, tenantId);
                    if (newActions) setWorkflowActions(newActions);
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : `Failed to apply action: ${wa.action}`);
                  }
                }}
                title={`${wa.from_state} → ${wa.to_state}`}
              >
                {wa.action}
              </button>
            ))}
          </div>
        )}
        {canPrint && isActive && (
          <button 
            className="logout" 
            onClick={() => navigate(`/print:${doctypeKey}:${recordId}`)}
            title="Open Print Preview"
          >
            <Printer size={16} style={{ marginRight: "6px" }} /> Print
          </button>
        )}
        {canUpdate && isActive && onEdit && (
          <button className="primary-action" onClick={onEdit}>Edit {config.doctype.label}</button>
        )}
        {canDelete && isActive && onDeactivate && (
          <button className="logout logout--danger" onClick={onDeactivate}>Deactivate</button>
        )}
        {canUpdate && !isActive && onReactivate && (
          <button className="logout" onClick={onReactivate}>Reactivate</button>
        )}
        {(onClose || onBack) && (
          <button className="logout" onClick={onClose ?? onBack}>Back to List</button>
        )}
      </div>
    </div>
  );
}
