import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDocTypeConfig } from "../../lib/metadata/doctype-registry";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";
import type { DocFieldMeta, FormLayoutSection } from "../../lib/metadata/types";
import { getDocTypeApi, detectAndRegisterGenericDocTypeApi } from "./doctype-api-map";
import { StatusField } from "./StatusField";
import { Printer } from "lucide-react";
import { useDocTypeFieldAccess } from "../../lib/metadata/use-doctype-field-access";

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
  const { readableFieldnames, loading: accessLoading, error: accessError } = useDocTypeFieldAccess(doctypeKey, tenantId ?? null);
  const [record, setRecord] = useState<Record<string, unknown> | null>(initialRecord ?? null);
  const [dataLoading, setDataLoading] = useState(!initialRecord);
  const [linkLabels, setLinkLabels] = useState<Record<string, string>>({});

  const api = useMemo(() => getDocTypeApi(doctypeKey), [doctypeKey]);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    if (api) { setApiReady(true); return; }
    let cancelled = false;
    detectAndRegisterGenericDocTypeApi(doctypeKey).then((detected) => {
      if (!cancelled) setApiReady(!!detected);
    });
    return () => { cancelled = true; };
  }, [doctypeKey, api]);

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

  return (
    <div className="module-stack">
      <div className="detail-head">
        <div>
          <p className="eyebrow">{config.doctype.label} Detail</p>
          <h3>{(record.name ?? record.sku ?? record.code ?? "Record") as string}</h3>
        </div>
        <StatusField value={isActive} />
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

      <div className="form-actions">
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
