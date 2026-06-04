import { useMemo } from "react";
import { DocFieldMeta, FullDocTypeConfig } from "../../lib/metadata/types";
import { PrintFormat } from "../../lib/print/print-types";
import { CompanyThemeSettings } from "../../lib/theme-types";

interface PrintRendererProps {
  config: FullDocTypeConfig;
  document: Record<string, any>;
  format: PrintFormat;
  theme: CompanyThemeSettings | null;
}

export function PrintRenderer({ config, document, format, theme }: PrintRendererProps) {
  const fieldMap = useMemo(() => {
    const map = new Map<string, DocFieldMeta>();
    config.fields.forEach((f) => map.set(f.fieldname, f));
    return map;
  }, [config]);

  const renderValue = (fieldname: string) => {
    const field = fieldMap.get(fieldname);
    const value = document[fieldname];

    if (value === null || value === undefined) return "-";

    if (field?.fieldtype === "Select") {
      const options = field.options as any;
      const option = Array.isArray(options) ? options.find((o) => o.value === value) : null;
      return option?.label || value;
    }

    if (field?.fieldtype === "Check") {
      return value ? "Yes" : "No";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const today = new Date().toLocaleDateString();

  return (
    <div className="print-renderer">
      {/* Header */}
      <header className="print-header">
        <div className="print-branding">
          {theme?.logo_url ? (
            <img src={theme.logo_url} alt="Logo" className="print-logo" />
          ) : (
            <div className="print-logo-placeholder">Hippo ERP</div>
          )}
          <div className="print-company-info">
            <h1 className="print-company-name">{theme?.company_name || "Hippo ERP"}</h1>
          </div>
        </div>
        <div className="print-document-title">
          <h2>{config.doctype.label}</h2>
          <p className="print-id">#{document.id?.toString().substring(0, 8)}</p>
        </div>
      </header>

      {/* Content */}
      <main className="print-content">
        {format.layout_json.sections.map((section, sIdx) => (
          <section key={sIdx} className="print-section">
            <h3>{section.label}</h3>
            <div className="print-grid">
              {section.fields.map((fieldname, fIdx) => {
                const field = fieldMap.get(fieldname);
                if (!field) return null;
                return (
                  <div key={fIdx} className="print-field">
                    <label>{field.label}</label>
                    <div className="print-value">{renderValue(fieldname)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Footer */}
      <footer className="print-footer">
        <div className="print-footer-info">
          <span>Printed on: {today}</span>
          <span>Hippo ERP - {config.doctype.label} Report</span>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .print-renderer {
          font-family: sans-serif;
          color: #333;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
          background: white;
        }
        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #eee;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .print-branding {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .print-logo {
          max-height: 60px;
          width: auto;
        }
        .print-logo-placeholder {
          font-weight: bold;
          font-size: 20px;
          color: #666;
        }
        .print-company-name {
          font-size: 18px;
          margin: 0;
          color: #111;
        }
        .print-document-title {
          text-align: right;
        }
        .print-document-title h2 {
          margin: 0;
          font-size: 24px;
          color: #2563eb;
        }
        .print-id {
          margin: 5px 0 0;
          font-size: 12px;
          color: #666;
          font-family: monospace;
        }
        .print-section {
          margin-bottom: 30px;
        }
        .print-section h3 {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #666;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        .print-grid {
          display: grid;
          grid-template-columns: 1fr 1fr; gap: 20px;
        }
        .print-field label {
          display: block;
          font-size: 11px;
          color: #888;
          margin-bottom: 3px;
        }
        .print-value {
          font-size: 14px;
          color: #111;
          word-break: break-word;
        }
        .print-footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 10px;
          color: #999;
        }
        .print-footer-info {
          display: flex;
          justify-content: space-between;
        }

        @media print {
          .print-renderer {
            padding: 0;
            max-width: 100%;
          }
          body {
            background: white;
          }
        }
      `}} />
    </div>
  );
}
