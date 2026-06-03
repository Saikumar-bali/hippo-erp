import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { DocFieldMeta } from "../../lib/metadata/types";
import { parseCsv } from "../../lib/export-import/csv-parse";
import { validateImportRows, type ImportValidationError } from "../../lib/export-import/import-validate";
import type { DocTypeApi } from "../metadata/doctype-api-map";

type Props = {
  doctypeKey: string;
  doctypeLabel: string;
  fields: DocFieldMeta[];
  api: DocTypeApi;
  tenantId: string;
  onClose: () => void;
  onImported: () => void;
};

type Step = "upload" | "preview" | "importing" | "done";

export function ImportPreviewDialog({ doctypeLabel, fields, api, tenantId, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseCsv> | null>(null);
  const [validation, setValidation] = useState<ReturnType<typeof validateImportRows> | null>(null);
  const [importResults, setImportResults] = useState<{ success: number; failed: { row: number; message: string }[] }>({ success: 0, failed: [] });

  const handlePaste = useCallback((text: string) => {
    setCsvText(text);
    const result = parseCsv(text);
    setParsed(result);

    if (result.headers.length === 0) {
      setValidation(null);
      return;
    }

    const v = validateImportRows(result.rows, result.headers, fields);
    setValidation(v);
  }, [fields]);

  const previewRows = useMemo(() => {
    if (!parsed || parsed.rows.length === 0) return [];
    return parsed.rows.slice(0, 10);
  }, [parsed]);

  const rowErrorMap = useMemo(() => {
    if (!validation) return new Map<number, ImportValidationError[]>();
    const map = new Map<number, ImportValidationError[]>();
    for (const err of validation.errors) {
      const list = map.get(err.row) ?? [];
      list.push(err);
      map.set(err.row, list);
    }
    return map;
  }, [validation]);

  const doImport = useCallback(async () => {
    if (!validation) return;
    setStep("importing");

    const failed: { row: number; message: string }[] = [];
    let success = 0;

    for (let i = 0; i < validation.validRows.length; i++) {
      const row = validation.validRows[i];
      const actualRowNum = i + 2;
      try {
        await api.create?.({ ...row, tenant_id: tenantId });
        success++;
      } catch (err: unknown) {
        failed.push({
          row: actualRowNum,
          message: err instanceof Error ? err.message : "Import failed",
        });
      }
    }

    setImportResults({ success, failed });
    setStep("done");

    if (failed.length === 0) {
      toast.success(`Imported ${success} ${doctypeLabel} record(s)`);
      onImported();
    } else {
      toast.error(`Imported ${success} record(s), ${failed.length} failed`);
    }
  }, [validation, api, tenantId, doctypeLabel, onImported]);

  const reset = useCallback(() => {
    setStep("upload");
    setCsvText("");
    setParsed(null);
    setValidation(null);
    setImportResults({ success: 0, failed: [] });
  }, []);

  return (
    <div className="card" style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div className="card-head">
        <h3>Import {doctypeLabel}</h3>
        <button className="logout" onClick={onClose}>Close</button>
      </div>

      {step === "upload" && (
        <div style={{ padding: "16px 0" }}>
          <p style={{ marginBottom: "8px", fontSize: "var(--font-size-sm)" }}>
            Paste CSV data below. The first row should be column headers matching field labels.
            Required columns are marked with * in the template.
          </p>
          <textarea
            style={{ width: "100%", minHeight: "200px", fontFamily: "monospace", fontSize: "var(--font-size-sm)" }}
            placeholder="Paste CSV content here..."
            value={csvText}
            onChange={(e) => handlePaste(e.target.value)}
          />
          <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
            <button
              className="logout"
              disabled={!csvText.trim()}
              onClick={() => {
                if (!parsed) return;
                if (parsed.errors.length > 0) {
                  toast.error(`CSV parse errors: ${parsed.errors.map((e) => `Row ${e.row}: ${e.message}`).join("; ")}`);
                  return;
                }
                if (!validation) return;
                if (parsed.rows.length === 0) {
                  toast.error("CSV has no data rows");
                  return;
                }
                setStep("preview");
              }}
            >
              Preview Import
            </button>
          </div>
          {parsed && parsed.errors.length > 0 && (
            <div style={{ marginTop: "8px", padding: "8px", background: "#fef2f2", borderRadius: "4px", fontSize: "var(--font-size-xs)" }}>
              <strong>Parse errors:</strong>
              <ul style={{ margin: "4px 0 0 16px" }}>
                {parsed.errors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {step === "preview" && parsed && validation && (
        <div style={{ padding: "16px 0" }}>
          <p style={{ marginBottom: "8px", fontSize: "var(--font-size-sm)" }}>
            <strong>Headers:</strong> {parsed.headers.join(", ")}
            {" | "}
            <strong>Rows:</strong> {parsed.rows.length}
            {" | "}
            <strong>Valid rows:</strong> {validation.validRows.length}
            {" | "}
            <strong>Errors:</strong> {validation.errors.length}
          </p>

          {validation.errors.length > 0 && (
            <div style={{ marginBottom: "12px", padding: "8px", background: "#fef2f2", borderRadius: "4px", fontSize: "var(--font-size-xs)" }}>
              <strong>Validation errors:</strong>
              <table style={{ width: "100%", marginTop: "4px", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "2px 4px", borderBottom: "1px solid #ddd" }}>Row</th>
                    <th style={{ textAlign: "left", padding: "2px 4px", borderBottom: "1px solid #ddd" }}>Field</th>
                    <th style={{ textAlign: "left", padding: "2px 4px", borderBottom: "1px solid #ddd" }}>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.errors.slice(0, 20).map((err, i) => (
                    <tr key={i}>
                      <td style={{ padding: "2px 4px" }}>{err.row}</td>
                      <td style={{ padding: "2px 4px" }}>{err.fieldname}</td>
                      <td style={{ padding: "2px 4px" }}>{err.message}</td>
                    </tr>
                  ))}
                  {validation.errors.length > 20 && (
                    <tr><td colSpan={3} style={{ padding: "2px 4px", fontStyle: "italic" }}>...and {validation.errors.length - 20} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {previewRows.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="erp-table" style={{ fontSize: "var(--font-size-xs)" }}>
                <thead>
                  <tr>
                    <th style={{ width: "30px" }}>#</th>
                    {parsed.headers.map((h, i) => (
                      <th key={i} style={{ whiteSpace: "nowrap", padding: "4px 6px" }}>{h}</th>
                    ))}
                    <th style={{ width: "80px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => {
                    const rowErrors = rowErrorMap.get(ri + 2) ?? [];
                    return (
                      <tr key={ri} style={rowErrors.length > 0 ? { background: "#fef2f2" } : undefined}>
                        <td style={{ padding: "4px 6px" }}>{ri + 1}</td>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: "4px 6px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cell}</td>
                        ))}
                        <td style={{ padding: "4px 6px" }}>
                          {rowErrors.length > 0 ? (
                            <span style={{ color: "#dc2626", fontSize: "var(--font-size-xs)" }}>Error</span>
                          ) : (
                            <span style={{ color: "#16a34a", fontSize: "var(--font-size-xs)" }}>OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {parsed.rows.length > 10 && (
                <p style={{ marginTop: "4px", fontSize: "var(--font-size-xs)", fontStyle: "italic" }}>
                  Showing first 10 of {parsed.rows.length} rows
                </p>
              )}
            </div>
          )}

          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <button className="logout" onClick={reset}>Back</button>
            <button
              className="logout"
              disabled={validation.validRows.length === 0}
              onClick={doImport}
            >
              Import {validation.validRows.length} Valid Row(s)
            </button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div style={{ padding: "24px", textAlign: "center" }}>
          <p>Importing records...</p>
        </div>
      )}

      {step === "done" && (
        <div style={{ padding: "16px 0" }}>
          <div className={`card ${importResults.failed.length === 0 ? "state-info" : ""}`} style={{ marginBottom: "12px" }}>
            <p><strong>Success:</strong> {importResults.success} record(s) created</p>
            {importResults.failed.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                <p><strong>Failed:</strong> {importResults.failed.length} row(s)</p>
                <table style={{ width: "100%", fontSize: "var(--font-size-xs)", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "2px 4px", borderBottom: "1px solid #ddd" }}>Row</th>
                      <th style={{ textAlign: "left", padding: "2px 4px", borderBottom: "1px solid #ddd" }}>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResults.failed.map((f, i) => (
                      <tr key={i}>
                        <td style={{ padding: "2px 4px" }}>{f.row}</td>
                        <td style={{ padding: "2px 4px" }}>{f.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="logout" onClick={reset}>Import Another File</button>
            <button className="logout" onClick={onClose}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
