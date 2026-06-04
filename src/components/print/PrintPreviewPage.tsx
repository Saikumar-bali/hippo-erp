import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useDocTypeConfig } from "../../lib/metadata/doctype-registry";
import { detectAndRegisterGenericDocTypeApi } from "../metadata/doctype-api-map";
import { getPrintFormats } from "../../lib/print/print-format-api";
import { PrintFormat } from "../../lib/print/print-types";
import { PrintRenderer } from "./PrintRenderer";
import { getCompanyTheme } from "../../lib/theme-api";
import { CompanyThemeSettings } from "../../lib/theme-types";

export function PrintPreviewPage() {
  const { doctypeKey, documentId } = useParams<{ doctypeKey: string; documentId: string }>();
  const { selectedTenantId } = useAuth();
  const navigate = useNavigate();

  const { config, loading: metaLoading, error: metaError } = useDocTypeConfig(doctypeKey || "");
  const [document, setDocument] = useState<Record<string, any> | null>(null);
  const [formats, setFormats] = useState<PrintFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<PrintFormat | null>(null);
  const [theme, setTheme] = useState<CompanyThemeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctypeKey || !documentId || !selectedTenantId || metaLoading) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1. Load Document Data
        const api = await detectAndRegisterGenericDocTypeApi(doctypeKey!);
        if (!api) throw new Error("Document API not found");
        const doc = await api.get(documentId!, selectedTenantId!);
        if (!doc) throw new Error("Document not found");
        setDocument(doc as Record<string, any>);

        // 2. Load Print Formats
        const availableFormats = await getPrintFormats(doctypeKey!, selectedTenantId!);
        setFormats(availableFormats);
        if (availableFormats.length > 0) {
          setSelectedFormat(availableFormats[0]);
        } else {
          // Fallback if no format seeded (should not happen with migration)
          throw new Error("No active print format found for this DocType");
        }

        // 3. Load Theme
        const companyTheme = await getCompanyTheme(selectedTenantId!);
        setTheme(companyTheme);

      } catch (err: any) {
        console.error("[PrintPreview] load error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [doctypeKey, documentId, selectedTenantId, metaLoading]);

  if (metaLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-gray-600">Preparing print preview...</p>
      </div>
    );
  }

  if (metaError || error || !config || !document || !selectedFormat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <AlertCircle className="text-red-500" size={48} />
        <h2 className="text-xl font-bold">Print Preview Failed</h2>
        <p className="text-gray-600 max-w-md text-center">{metaError || error || "Incomplete data"}</p>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-blue-600 hover:underline">
          <ArrowLeft size={18} /> Go Back
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-preview-container bg-gray-100 min-h-screen pb-20">
      {/* Control Bar (hidden in print) */}
      <div className="print-controls flex items-center justify-between p-4 bg-white border-bottom sticky top-0 shadow-sm z-10 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold">Print Preview</h1>
            <p className="text-xs text-gray-500">{config.doctype.label} #{documentId?.substring(0, 8)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {formats.length > 1 && (
            <select 
              className="text-sm border rounded px-3 py-1.5"
              value={selectedFormat.id}
              onChange={(e) => {
                const f = formats.find(fmt => fmt.id === e.target.value);
                if (f) setSelectedFormat(f);
              }}
            >
              {formats.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          )}

          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      {/* Actual Renderer */}
      <div className="print-content-wrapper p-8">
        <div className="bg-white shadow-xl mx-auto rounded-lg overflow-hidden border">
          <PrintRenderer 
            config={config}
            document={document}
            format={selectedFormat}
            theme={theme}
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print {
            display: none !important;
          }
          .print-preview-container {
            background: white !important;
            padding: 0 !important;
          }
          .print-content-wrapper {
            padding: 0 !important;
          }
          .bg-white.shadow-xl {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}} />
    </div>
  );
}
