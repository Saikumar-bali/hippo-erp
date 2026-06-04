import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { getDocTypeMeta, getDocFields, getDocTypeActions, getDefaultListView, getDefaultFormLayout } from "../../lib/metadata/metadata-api";
import { loadExistingPermissionKeys } from "../../lib/metadata/metadata-studio-api";
import { clearMetadataCache } from "../../lib/metadata/doctype-registry";
import type { DocTypeMeta, DocFieldMeta, DocTypeActionMeta, ListViewMeta, FormLayoutMeta } from "../../lib/metadata/types";

type ChecklistItem = {
  key: string;
  label: string;
  status: "pass" | "warning" | "error" | "pending";
  message: string;
  repair?: () => Promise<string>;
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  marginBottom: "12px",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "var(--font-size-sm, 12px)",
  padding: "4px 8px",
  borderRadius: "4px",
};

const badgeStyle = (status: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "1px 6px",
  borderRadius: "3px",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  backgroundColor:
    status === "pass" ? "#d1fae5" :
    status === "warning" ? "#fef3c7" :
    status === "error" ? "#fee2e2" : "#f1f5f9",
  color:
    status === "pass" ? "#065f46" :
    status === "warning" ? "#92400e" :
    status === "error" ? "#991b1b" : "#475569",
});

const repairBtnStyle: React.CSSProperties = {
  padding: "2px 8px",
  fontSize: "10px",
  fontWeight: 600,
  border: "1px solid #d1d5db",
  borderRadius: "3px",
  background: "#fff",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

async function loadRolePermissionGrants(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase.schema("app")
    .from("role_permission_grants")
    .select("role, permission_key")
    .eq("is_granted", true);
  if (error) throw new Error(error.message);
  const map: Record<string, string[]> = {};
  for (const row of (data ?? []) as { role: string; permission_key: string }[]) {
    if (!map[row.role]) map[row.role] = [];
    map[row.role].push(row.permission_key);
  }
  return map;
}

async function findWorkspaceItem(doctypeKey: string) {
  const { data, error } = await supabase.schema("app")
    .from("erp_workspace_items")
    .select("*")
    .eq("target", doctypeKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown> | null;
}

async function createDefaultActions(doctypeKey: string): Promise<string> {
  const defaults = [
    { action_key: "read", permission_key: `view_${doctypeKey}` },
    { action_key: "create", permission_key: `create_${doctypeKey}` },
    { action_key: "update", permission_key: `update_${doctypeKey}` },
    { action_key: "deactivate", permission_key: `delete_${doctypeKey}` },
  ];
  let created = 0;
  for (const a of defaults) {
    const { error } = await supabase.schema("app")
      .from("erp_doctype_actions")
      .insert({ doctype_key: doctypeKey, action_key: a.action_key, permission_key: a.permission_key })
      .maybeSingle();
    if (error && !error.message.includes("duplicate")) throw error;
    if (!error) created++;
  }
  return `Created ${created} missing action(s)`;
}

async function createMissingPermissions(doctypeKey: string, existing: string[], moduleKey: string, moduleLabel: string): Promise<string> {
  const needed = [
    `view_${doctypeKey}`, 
    `create_${doctypeKey}`, 
    `update_${doctypeKey}`, 
    `delete_${doctypeKey}`,
    `print_${doctypeKey}`
  ];
  let created = 0;
  for (const key of needed) {
    if (existing.includes(key)) continue;
    const { error } = await supabase.schema("app")
      .from("permissions")
      .insert({
        permission_key: key,
        module_key: moduleKey,
        module_label: moduleLabel,
        permission_label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: `Auto-created for ${doctypeKey}`,
        sort_order: 50,
      })
      .maybeSingle();
    if (error && !error.message.includes("duplicate")) throw error;
    if (!error) created++;
  }
  return `Created ${created} missing permission(s) in catalog`;
}

async function grantOwnerAdmin(doctypeKey: string): Promise<string> {
  const needed = [
    `view_${doctypeKey}`, 
    `create_${doctypeKey}`, 
    `update_${doctypeKey}`, 
    `delete_${doctypeKey}`,
    `print_${doctypeKey}`
  ];
  const roles = ["owner", "admin"];
  let granted = 0;
  for (const role of roles) {
    for (const key of needed) {
      const { error } = await supabase.schema("app")
        .from("role_permission_grants")
        .upsert({ role, permission_key: key, is_granted: true }, { onConflict: "role,permission_key" })
        .maybeSingle();
      if (error) throw error;
      granted++;
    }
  }
  return `Granted ${granted} permission(s) to owner/admin`;
}

async function createDefaultListView(doctypeKey: string, fields: DocFieldMeta[]): Promise<string> {
  const listFields = fields.filter((f) => f.in_list_view);
  const cols = listFields.length > 0 ? listFields : fields.slice(0, 4);
  const columnsJson = cols.map((f) => ({ fieldname: f.fieldname, label: f.label, width: 150 }));
  const { error } = await supabase.schema("app")
    .from("erp_list_views")
    .insert({
      doctype_key: doctypeKey,
      view_key: "default",
      label: "Default",
      columns_json: columnsJson,
      is_default: true,
    })
    .maybeSingle();
  if (error && !error.message.includes("duplicate")) throw error;
  return `Created default list view with ${columnsJson.length} column(s)`;
}

async function createDefaultFormLayout(doctypeKey: string, fields: DocFieldMeta[]): Promise<string> {
  const sections = [
    {
      section_label: "Details",
      columns: fields.map((f) => ({ fieldname: f.fieldname, label: f.label })),
    },
  ];
  const { error } = await supabase.schema("app")
    .from("erp_form_layouts")
    .insert({
      doctype_key: doctypeKey,
      layout_key: "default",
      label: "Default",
      sections_json: sections,
      is_default: true,
    })
    .maybeSingle();
  if (error && !error.message.includes("duplicate")) throw error;
  return `Created default form layout with ${fields.length} field(s)`;
}

async function activateWorkspaceItem(doctypeKey: string): Promise<string> {
  const { data: items, error } = await supabase.schema("app")
    .from("erp_workspace_items")
    .select("id, is_active")
    .eq("target", doctypeKey);
  if (error) throw new Error(error.message);
  let updated = 0;
  for (const item of (items ?? []) as { id: string; is_active: boolean }[]) {
    if (!item.is_active) {
      await supabase.schema("app").from("erp_workspace_items").update({ is_active: true }).eq("id", item.id);
      updated++;
    }
  }
  return updated > 0 ? `Activated ${updated} workspace item(s)` : "No inactive items found";
}

async function fixWorkspaceTarget(doctypeKey: string): Promise<string> {
  const { data: items, error } = await supabase.schema("app")
    .from("erp_workspace_items")
    .select("id, target, item_type")
    .eq("target", doctypeKey);
  if (error) throw new Error(error.message);
  let fixed = 0;
  for (const item of (items ?? []) as { id: string; target: string; item_type: string }[]) {
    if (item.item_type !== "doctype") {
      await supabase.schema("app").from("erp_workspace_items").update({ item_type: "doctype" }).eq("id", item.id);
      fixed++;
    }
  }
  return fixed > 0 ? `Fixed ${fixed} workspace item type(s) to "doctype"` : "Target already correct";
}

type Props = {
  doctypeKey?: string;
};

export function DocTypeCompletionChecklist({ doctypeKey: initialKey }: Props) {
  const [doctypeKey, setDoctypeKey] = useState(initialKey ?? "");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [repairing, setRepairing] = useState<string | null>(null);

  const runCheck = useCallback(async (key: string) => {
    if (!key.trim()) return;
    setLoading(true);
    setRan(true);
    const results: ChecklistItem[] = [];
    try {
      const doctype: DocTypeMeta | null = await getDocTypeMeta(key);
      const fields: DocFieldMeta[] = doctype ? await getDocFields(key) : [];
      const actions: DocTypeActionMeta[] = doctype ? await getDocTypeActions(key) : [];
      const listView: ListViewMeta | null = doctype ? await getDefaultListView(key) : null;
      const formLayout: FormLayoutMeta | null = doctype ? await getDefaultFormLayout(key) : null;
      const permissionKeys: string[] = await loadExistingPermissionKeys();
      const roleGrants: Record<string, string[]> = await loadRolePermissionGrants();
      const wsItem: Record<string, unknown> | null = await findWorkspaceItem(key);
      
      // Load module meta if doctype exists to get the label
      let moduleMeta: { label: string } | null = null;
      if (doctype) {
        const { data: modData } = await supabase.schema("app")
          .from("erp_modules")
          .select("label")
          .eq("module_key", doctype.module_key)
          .maybeSingle();
        moduleMeta = modData as { label: string } | null;
      }

      // 1. DocType exists
      if (doctype) {
        results.push({ key: "doctype_exists", label: "DocType exists", status: "pass", message: `DocType "${key}" found (Module: ${doctype.module_key})` });
      } else {
        results.push({ key: "doctype_exists", label: "DocType exists", status: "error", message: `DocType "${key}" not registered in erp_doctypes` });
      }

      // 2. Storage strategy set
      if (doctype?.storage_strategy) {
        results.push({ key: "storage_strategy", label: "Storage strategy set", status: "pass", message: `Storage: ${doctype.storage_strategy}` });
      } else {
        results.push({ key: "storage_strategy", label: "Storage strategy set", status: doctype ? "error" : "pending", message: "No storage_strategy on DocType" });
      }

      // 3. DocFields exist
      if (fields.length > 0) {
        const titleField = fields.find((f) => f.is_required);
        if (titleField) {
          results.push({ key: "fields_exist", label: "DocFields exist", status: "pass", message: `${fields.length} field(s), required field: ${titleField.fieldname}` });
        } else {
          results.push({ key: "fields_exist", label: "DocFields exist", status: "warning", message: `${fields.length} field(s) but no required/title field` });
        }
      } else {
        results.push({ key: "fields_exist", label: "DocFields exist", status: "error", message: "No fields defined" });
      }

      // 4. List View exists
      if (listView) {
        const cols = listView.columns_json;
        const valid = Array.isArray(cols) && cols.length > 0;
        results.push({ key: "list_view", label: "List View exists", status: valid ? "pass" : "warning", message: valid ? `${(cols as unknown[]).length} column(s)` : "List View exists but columns_json is empty/invalid", repair: fields.length > 0 ? () => createDefaultListView(key, fields) : undefined });
      } else {
        results.push({ key: "list_view", label: "List View exists", status: "error", message: "No default list view found", repair: fields.length > 0 ? () => createDefaultListView(key, fields) : undefined });
      }

      // 5. Form Layout exists
      if (formLayout) {
        const secs = formLayout.sections_json;
        const valid = Array.isArray(secs) && secs.length > 0;
        results.push({ key: "form_layout", label: "Form Layout exists", status: valid ? "pass" : "warning", message: valid ? `${(secs as unknown[]).length} section(s)` : "Form Layout exists but sections_json is empty/invalid", repair: fields.length > 0 ? () => createDefaultFormLayout(key, fields) : undefined });
      } else {
        results.push({ key: "form_layout", label: "Form Layout exists", status: "error", message: "No default form layout found", repair: fields.length > 0 ? () => createDefaultFormLayout(key, fields) : undefined });
      }

      // 6. DocType Actions exist
      const requiredActions = ["read", "create", "update", "deactivate"];
      const missingActions = requiredActions.filter((a) => !actions.some((ra) => ra.action_key === a));
      if (missingActions.length === 0) {
        results.push({ key: "actions_exist", label: "DocType Actions exist", status: "pass", message: `${actions.length} action(s) cover all required (read, create, update, deactivate)` });
      } else {
        results.push({ key: "actions_exist", label: "DocType Actions exist", status: "error", message: `Missing: ${missingActions.join(", ")}`, repair: () => createDefaultActions(key) });
      }

      // 7. Permission keys exist
      const actionPermKeys = actions.map((a) => a.permission_key);
      const permKeys = [...new Set([...actionPermKeys, `view_${key}`, `create_${key}`, `update_${key}`, `delete_${key}`])];
      const missingPerms = permKeys.filter((p) => !permissionKeys.includes(p));
      if (missingPerms.length === 0) {
        results.push({ key: "perm_keys_exist", label: "Permission keys exist in catalog", status: "pass", message: `${permKeys.length} permission key(s) found` });
      } else {
        results.push({ 
          key: "perm_keys_exist", 
          label: "Permission keys exist in catalog", 
          status: "error", 
          message: `Missing in catalog: ${missingPerms.join(", ")}`, 
          repair: () => createMissingPermissions(
            key, 
            permissionKeys, 
            doctype?.module_key ?? "other", 
            moduleMeta?.label ?? doctype?.module_key ?? "Other"
          ) 
        });
      }

      // 8. Permission grants for owner/admin
      const ownerPerms = roleGrants["owner"] ?? [];
      const adminPerms = roleGrants["admin"] ?? [];
      const missingOwner = permKeys.filter((p) => !ownerPerms.includes(p));
      const missingAdmin = permKeys.filter((p) => !adminPerms.includes(p));
      if (missingOwner.length === 0 && missingAdmin.length === 0) {
        results.push({ key: "perm_grants", label: "Permission grants exist for owner/admin", status: "pass", message: "All permissions granted to owner and admin" });
      } else {
        const details: string[] = [];
        if (missingOwner.length > 0) details.push(`owner lacks: ${missingOwner.join(", ")}`);
        if (missingAdmin.length > 0) details.push(`admin lacks: ${missingAdmin.join(", ")}`);
        results.push({ key: "perm_grants", label: "Permission grants exist for owner/admin", status: "error", message: details.join("; "), repair: () => grantOwnerAdmin(key) });
      }

      // 9. Workspace Item exists
      if (wsItem) {
        results.push({ key: "ws_item_exists", label: "Workspace Item exists", status: "pass", message: `Found in workspace "${wsItem.workspace_key}"` });
      } else {
        results.push({ key: "ws_item_exists", label: "Workspace Item exists", status: "error", message: `No workspace item targeting "${key}"` });
      }

      // 10. Workspace Item active
      if (wsItem) {
        const active = wsItem.is_active === true;
        results.push({ key: "ws_item_active", label: "Workspace Item active", status: active ? "pass" : "error", message: active ? "Item is active" : "Item is inactive", repair: active ? undefined : () => activateWorkspaceItem(key) });
      } else {
        results.push({ key: "ws_item_active", label: "Workspace Item active", status: "pending", message: "No workspace item to check" });
      }

      // 11. Workspace item target matches doctype_key
      if (wsItem) {
        const targetMatch = wsItem.target === key;
        const typeMatch = wsItem.item_type === "doctype";
        if (targetMatch && typeMatch) {
          results.push({ key: "ws_target", label: "Workspace item target matches", status: "pass", message: `target=${wsItem.target}, type=${wsItem.item_type}` });
        } else {
          const issues: string[] = [];
          if (!targetMatch) issues.push(`target is "${wsItem.target}" instead of "${key}"`);
          if (!typeMatch) issues.push(`item_type is "${wsItem.item_type}" instead of "doctype"`);
          results.push({ key: "ws_target", label: "Workspace item target matches", status: "error", message: issues.join("; "), repair: typeMatch ? undefined : () => fixWorkspaceTarget(key) });
        }
      } else {
        results.push({ key: "ws_target", label: "Workspace item target matches", status: "pending", message: "No workspace item to check" });
      }

      // 12. Route/API can resolve
      if (doctype?.storage_strategy) {
        if (doctype.storage_strategy === "generic_json") {
          results.push({ key: "api_resolve", label: "Route/API can resolve", status: "pass", message: "generic_json — auto-detected API available" });
        } else if (doctype.storage_strategy === "physical_rpc") {
          const hasRead = actions.some((a) => a.action_key === "read");
          results.push({ key: "api_resolve", label: "Route/API can resolve", status: hasRead ? "pass" : "warning", message: hasRead ? "physical_rpc with read action defined" : "physical_rpc but no read action — UI may not render" });
        } else {
          results.push({ key: "api_resolve", label: "Route/API can resolve", status: "warning", message: `Unknown storage_strategy: ${doctype.storage_strategy}` });
        }
      } else {
        results.push({ key: "api_resolve", label: "Route/API can resolve", status: "error", message: "Cannot resolve — no storage_strategy" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Check failed";
      results.push({ key: "check_error", label: "Check execution", status: "error", message: msg });
    }
    setItems(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialKey) {
      setDoctypeKey(initialKey);
      void runCheck(initialKey);
    }
  }, [initialKey, runCheck]);

  useEffect(() => {
    if (doctypeKey && !ran && !loading) {
      void runCheck(doctypeKey);
    }
  }, [doctypeKey, ran, loading, runCheck]);

  const handleRepair = async (idx: number) => {
    const item = items[idx];
    if (!item.repair) return;
    setRepairing(item.key);
    try {
      const msg = await item.repair();
      toast.success(msg);
      clearMetadataCache();
      await runCheck(doctypeKey);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Repair failed");
    } finally {
      setRepairing(null);
    }
  };

  const passCount = items.filter((i) => i.status === "pass").length;
  const warnCount = items.filter((i) => i.status === "warning").length;
  const errCount = items.filter((i) => i.status === "error").length;

  return (
    <div className="card" style={{ padding: "var(--card-padding)" }}>
      <h2 style={{ margin: "0 0 12px" }}>Check / Repair DocType</h2>
      <p style={{ fontSize: "var(--font-size-sm, 12px)", color: "#6b7280", margin: "0 0 16px" }}>
        Diagnose and repair missing metadata for a DocType. Menu item visible does not mean the DocType is complete.
      </p>
      <div className="studio-panel studio-panel--warm" style={{ marginBottom: "16px" }}>
        <div className="studio-icon-title">
          <strong>Missing Grants?</strong>
        </div>
        <div className="studio-subtle" style={{ color: "#8b5e00" }}>
          Use Check / Repair to create missing action rows, permission catalog keys, and owner or admin defaults. Use Access Control Manager to grant the resulting rights to company roles and users.
        </div>
      </div>

      {!initialKey && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            type="text"
            value={doctypeKey}
            onChange={(e) => setDoctypeKey(e.target.value)}
            placeholder="Enter doctype key (e.g. purchase_invoice)"
            style={{
              flex: 1,
              padding: "6px 8px",
              fontSize: "var(--font-size-sm, 12px)",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontFamily: "monospace",
            }}
            onKeyDown={(e) => { if (e.key === "Enter") runCheck(doctypeKey); }}
          />
          <button className="primary" onClick={() => runCheck(doctypeKey)} disabled={loading || !doctypeKey.trim()}>
            {loading ? "Checking…" : "Check"}
          </button>
        </div>
      )}

      {loading && <div className="card state-info">Checking DocType readiness…</div>}

      {!loading && ran && items.length > 0 && (
        <>
          <div style={{ marginBottom: "16px", padding: "8px", backgroundColor: "#f8fafc", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "var(--font-size-sm, 12px)", color: "#64748b" }}>Results for: </span>
            <code style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>{doctypeKey}</code>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px", fontSize: "var(--font-size-sm, 12px)" }}>
            <span style={{ color: "#065f46", fontWeight: 600 }}>{passCount} pass</span>
            {warnCount > 0 && <span style={{ color: "#92400e", fontWeight: 600 }}>{warnCount} warning(s)</span>}
            {errCount > 0 && <span style={{ color: "#991b1b", fontWeight: 600 }}>{errCount} error(s)</span>}
          </div>

          <div style={sectionStyle}>
            {items.map((item, idx) => (
              <div key={item.key} style={{ ...rowStyle, backgroundColor: item.status === "error" ? "#fef2f2" : item.status === "warning" ? "#fffbeb" : item.status === "pass" ? "#f0fdf4" : "#f8fafc" }}>
                <span style={badgeStyle(item.status)}>{item.status}</span>
                <span style={{ flex: 1 }}>
                  <strong>{item.label}</strong>
                  <span style={{ color: "#6b7280", marginLeft: "8px" }}>{item.message}</span>
                </span>
                {item.repair && (
                  <button
                    style={repairBtnStyle}
                    onClick={() => handleRepair(idx)}
                    disabled={repairing === item.key}
                  >
                    {repairing === item.key ? "Fixing…" : "Fix"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && !ran && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
          {initialKey ? "Loading…" : "Enter a DocType key and click Check to begin"}
        </div>
      )}
    </div>
  );
}
