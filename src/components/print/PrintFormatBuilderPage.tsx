import { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { getDocTypes } from "../../lib/metadata/metadata-studio-api";
import { getPrintFormats, savePrintFormat } from "../../lib/print/print-format-api";
import { DocTypeMeta } from "../../lib/metadata/types";
import { PrintFormat } from "../../lib/print/print-types";
import { useDocTypeConfig } from "../../lib/metadata/doctype-registry";

export function PrintFormatBuilderPage() {
  const { selectedTenantId } = useAuth();
  const [doctypes, setDocTypes] = useState<DocTypeMeta[]>([]);
  const [selectedDocTypeKey, setSelectedDocTypeKey] = useState("");
  const [formats, setFormats] = useState<PrintFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<Partial<PrintFormat> | null>(null);
  const [loading, setLoading] = useState(true);

  // Load available DocTypes
  useEffect(() => {
    getDocTypes().then((data) => {
      setDocTypes(data);
      if (data.length > 0) setSelectedDocTypeKey(data[0].doctype_key);
    }).finally(() => setLoading(false));
  }, []);

  // Load formats when DocType changes
  useEffect(() => {
    if (!selectedDocTypeKey || !selectedTenantId) return;
    getPrintFormats(selectedDocTypeKey, selectedTenantId).then(setFormats);
  }, [selectedDocTypeKey, selectedTenantId]);

  const { config: meta } = useDocTypeConfig(selectedDocTypeKey);

  const handleCreateNew = () => {
    if (!selectedTenantId || !selectedDocTypeKey) return;
    setSelectedFormat({
      tenant_id: selectedTenantId,
      doctype_key: selectedDocTypeKey,
      format_key: "new_format_" + Date.now().toString().slice(-4),
      label: "New Print Format",
      is_default: false,
      is_active: true,
      layout_json: { sections: [] },
      header_json: {},
      footer_json: {}
    });
  };

  const handleAddSection = () => {
    if (!selectedFormat) return;
    const sections = [...(selectedFormat.layout_json?.sections || [])];
    sections.push({ label: "New Section", fields: [] });
    setSelectedFormat({ ...selectedFormat, layout_json: { ...selectedFormat.layout_json!, sections } });
  };

  const handleRemoveSection = (idx: number) => {
    if (!selectedFormat) return;
    const sections = [...(selectedFormat.layout_json?.sections || [])];
    sections.splice(idx, 1);
    setSelectedFormat({ ...selectedFormat, layout_json: { ...selectedFormat.layout_json!, sections } });
  };

  const handleToggleField = (sectionIdx: number, fieldname: string) => {
    if (!selectedFormat) return;
    const sections = [...(selectedFormat.layout_json?.sections || [])];
    const fields = [...sections[sectionIdx].fields];
    
    if (fields.includes(fieldname)) {
      sections[sectionIdx].fields = fields.filter(f => f !== fieldname);
    } else {
      sections[sectionIdx].fields.push(fieldname);
    }
    
    setSelectedFormat({ ...selectedFormat, layout_json: { ...selectedFormat.layout_json!, sections } });
  };

  const handleSave = async () => {
    if (!selectedFormat) return;
    const res = await savePrintFormat(selectedFormat);
    if (res.ok) {
      toast.success("Print format saved");
      getPrintFormats(selectedDocTypeKey, selectedTenantId!).then(setFormats);
      setSelectedFormat(null);
    } else {
      toast.error("Failed to save: " + res.error);
    }
  };

  if (loading) return <div className="p-8">Loading Print Format Builder...</div>;

  return (
    <div className="module-stack p-4">
      <div className="card">
        <div className="card-head">
          <h3>Print Format Builder</h3>
          <div className="flex gap-2">
            <select 
              className="text-sm border rounded px-2"
              value={selectedDocTypeKey}
              onChange={(e) => {
                setSelectedDocTypeKey(e.target.value);
                setSelectedFormat(null);
              }}
            >
              {doctypes.map(dt => (
                <option key={dt.doctype_key} value={dt.doctype_key}>{dt.label}</option>
              ))}
            </select>
            <button className="primary-action flex items-center gap-1" onClick={handleCreateNew}>
              <Plus size={16} /> New Format
            </button>
          </div>
        </div>

        <div className="table-wrap mt-4">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Key</th>
                <th>Default</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {formats.map(f => (
                <tr key={f.id}>
                  <td>{f.label}</td>
                  <td><code>{f.format_key}</code></td>
                  <td>{f.is_default ? "✅" : ""}</td>
                  <td>{f.is_active ? "Active" : "Inactive"}</td>
                  <td>
                    <button className="link-button" onClick={() => setSelectedFormat(f)}>Edit</button>
                  </td>
                </tr>
              ))}
              {formats.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">No print formats found for this DocType.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedFormat && (
        <div className="card mt-4 border-primary">
          <div className="card-head">
            <h4>{selectedFormat.id ? "Edit Format" : "New Format"}: {selectedFormat.label}</h4>
            <div className="flex gap-2">
              <button className="logout" onClick={() => setSelectedFormat(null)}>Cancel</button>
              <button className="primary-action flex items-center gap-1" onClick={handleSave}>
                <Save size={16} /> Save Format
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-4">
            <div className="form-stack">
              <div className="field-group">
                <label>Label</label>
                <input 
                  type="text" 
                  value={selectedFormat.label} 
                  onChange={e => setSelectedFormat({...selectedFormat, label: e.target.value})}
                />
              </div>
              <div className="field-group">
                <label>Format Key</label>
                <input 
                  type="text" 
                  value={selectedFormat.format_key} 
                  onChange={e => setSelectedFormat({...selectedFormat, format_key: e.target.value})}
                  disabled={!!selectedFormat.id}
                />
              </div>
              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  checked={selectedFormat.is_default} 
                  onChange={e => setSelectedFormat({...selectedFormat, is_default: e.target.checked})}
                />
                <label>Set as Default</label>
              </div>

              <hr className="my-4" />
              
              <div className="flex justify-between items-center mb-2">
                <h5>Sections & Fields</h5>
                <button className="logout flex items-center gap-1 py-1" onClick={handleAddSection}>
                  <Plus size={14} /> Add Section
                </button>
              </div>

              <div className="sections-list flex flex-col gap-4">
                {selectedFormat.layout_json?.sections.map((section, sIdx) => (
                  <div key={sIdx} className="border rounded p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <input 
                        className="font-bold bg-transparent border-none p-0 focus:ring-0"
                        value={section.label}
                        onChange={e => {
                          const sections = [...selectedFormat.layout_json!.sections];
                          sections[sIdx].label = e.target.value;
                          setSelectedFormat({...selectedFormat, layout_json: {sections}});
                        }}
                      />
                      <button className="text-red-500 hover:text-red-700" onClick={() => handleRemoveSection(sIdx)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {meta?.fields.filter(f => !f.is_hidden).map(f => (
                        <label key={f.fieldname} className="flex items-center gap-1 cursor-pointer hover:bg-white p-1 rounded">
                          <input 
                            type="checkbox" 
                            checked={section.fields.includes(f.fieldname)} 
                            onChange={() => handleToggleField(sIdx, f.fieldname)}
                          />
                          {f.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="preview-pane border rounded-lg bg-gray-100 p-4 overflow-auto max-h-[600px]">
               <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Layout Preview</p>
               <div className="bg-white shadow p-8 min-h-[400px]">
                  <h2 className="text-xl font-bold border-b pb-4 mb-6">{selectedFormat.label}</h2>
                  {selectedFormat.layout_json?.sections.map((s, idx) => (
                    <div key={idx} className="mb-6">
                      <h3 className="text-sm font-bold text-gray-500 uppercase border-b mb-3">{s.label}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {s.fields.map(fn => {
                          const field = meta?.fields.find(f => f.fieldname === fn);
                          return (
                            <div key={fn}>
                              <p className="text-[10px] text-gray-400 uppercase">{field?.label || fn}</p>
                              <p className="text-sm text-gray-800">[Value]</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
