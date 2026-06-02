import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createRecord,
  getDocTypeRecord,
  listDocTypeActionsForDoctype,
  loadDocTypeKeys,
  loadExistingPermissionKeys,
  loadModuleKeys,
  updateRecord,
} from "../../lib/metadata/metadata-studio-api";
import { supabase } from "../../lib/supabase";

type AccessAction = {
  id?: string;
  action_key: "read" | "create" | "update" | "deactivate";
  permission_key: string;
};

type GrantStatus = {
  owner: boolean;
  admin: boolean;
};

function defaultActions(doctypeKey: string): AccessAction[] {
  return [
    { action_key: "read", permission_key: `view_${doctypeKey}` },
    { action_key: "create", permission_key: `create_${doctypeKey}` },
    { action_key: "update", permission_key: `update_${doctypeKey}` },
    { action_key: "deactivate", permission_key: `delete_${doctypeKey}` },
  ];
}

async function loadRoleGrant(permissionKey: string, role: "owner" | "admin") {
  const { data, error } = await supabase
    .schema("app")
    .from("role_permission_grants")
    .select("permission_key")
    .eq("role", role)
    .eq("permission_key", permissionKey)
    .eq("is_granted", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export function AccessBuilder() {
  const [docTypes, setDocTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [modules, setModules] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [actions, setActions] = useState<AccessAction[]>([]);
  const [existingPermissions, setExistingPermissions] = useState<Set<string>>(new Set());
  const [grants, setGrants] = useState<Record<string, GrantStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  async function loadAccessState(doctypeKey: string) {
    if (!doctypeKey) {
      setActions([]);
      setGrants({});
      setMessage("");
      return;
    }

    const [rows, permissionKeys] = await Promise.all([
      listDocTypeActionsForDoctype(doctypeKey),
      loadExistingPermissionKeys(),
    ]);

    const mapped = defaultActions(doctypeKey).map((action) => {
      const existing = rows.find((row) => String(row.action_key) === action.action_key);
      return existing
        ? { id: String(existing.id), action_key: action.action_key, permission_key: String(existing.permission_key ?? action.permission_key) }
        : action;
    });

    const nextGrants: Record<string, GrantStatus> = {};
    for (const action of mapped) {
      nextGrants[action.action_key] = {
        owner: await loadRoleGrant(action.permission_key, "owner"),
        admin: await loadRoleGrant(action.permission_key, "admin"),
      };
    }

    setActions(mapped);
    setExistingPermissions(new Set(permissionKeys));
    setGrants(nextGrants);
    setMessage("");
  }

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      try {
        const [doctypeRows, moduleRows] = await Promise.all([loadDocTypeKeys(), loadModuleKeys()]);
        if (cancelled) return;
        setDocTypes(doctypeRows);
        setModules(moduleRows);
        const first = doctypeRows[0]?.value ?? "";
        setSelectedDocType(first);
        await loadAccessState(first);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load Access Builder");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveActions() {
    if (!selectedDocType) return;
    setSaving(true);
    try {
      for (const action of actions) {
        if (!action.permission_key.trim()) throw new Error(`Permission key is required for ${action.action_key}`);
        const payload = {
          doctype_key: selectedDocType,
          action_key: action.action_key,
          permission_key: action.permission_key.trim(),
        };
        if (action.id) {
          await updateRecord("doctype_actions", action.id, payload);
        } else {
          await createRecord("doctype_actions", payload);
        }
      }
      setMessage("Action mappings saved.");
      toast.success("Action mappings saved");
      await loadAccessState(selectedDocType);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save action mappings");
    } finally {
      setSaving(false);
    }
  }

  async function createMissingAccessKeys() {
    if (!selectedDocType) return;
    setSaving(true);
    try {
      const doctype = await getDocTypeRecord(selectedDocType);
      if (!doctype) throw new Error("DocType not found");
      const moduleKey = String(doctype.module_key ?? "metadata_studio");
      const moduleLabel = modules.find((module) => module.value === moduleKey)?.label.split(" (")[0] ?? moduleKey;

      let created = 0;
      for (const action of actions) {
        if (existingPermissions.has(action.permission_key)) continue;
        await supabase.schema("app").from("permissions").insert({
          permission_key: action.permission_key,
          module_key: moduleKey,
          module_label: moduleLabel,
          permission_label: action.permission_key.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()),
          description: `Metadata Studio access key for ${selectedDocType}`,
          sort_order: 50,
        });
        created += 1;
      }

      setMessage(created === 0 ? "All access keys already existed." : `Created ${created} missing access key(s).`);
      toast.success(created === 0 ? "No access keys needed" : `Created ${created} access key(s)`);
      await loadAccessState(selectedDocType);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create access keys");
    } finally {
      setSaving(false);
    }
  }

  async function enableOwnerAdminAccess() {
    if (!selectedDocType) return;
    setSaving(true);
    try {
      for (const action of actions) {
        await supabase.schema("app").from("role_permission_grants").upsert(
          [
            { role: "owner", permission_key: action.permission_key, is_granted: true },
            { role: "admin", permission_key: action.permission_key, is_granted: true },
          ],
          { onConflict: "role,permission_key" },
        );
      }
      setMessage("Owner and admin access enabled.");
      toast.success("Owner/admin access enabled");
      await loadAccessState(selectedDocType);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to grant owner/admin access");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: "var(--card-padding)", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>Access Builder</h3>
          <p style={{ margin: "4px 0 0", fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>
            Set up standard read/create/update/delete access through UI-managed action keys, permission keys, and grants.
          </p>
        </div>
        <select
          value={selectedDocType}
          onChange={async (event) => {
            const doctypeKey = event.target.value;
            setSelectedDocType(doctypeKey);
            await loadAccessState(doctypeKey);
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
        <div className="state-info">Loading Access Builder…</div>
      ) : (
        <>
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)", overflow: "hidden" }}>
            <table className="erp-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Permission Key</th>
                  <th>Catalog</th>
                  <th>Owner</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <tr key={action.action_key}>
                    <td style={{ textTransform: "capitalize", fontWeight: 600 }}>{action.action_key}</td>
                    <td>
                      <input
                        value={action.permission_key}
                        onChange={(event) => setActions((prev) => prev.map((item) => item.action_key === action.action_key ? { ...item, permission_key: event.target.value } : item))}
                        placeholder={`${action.action_key}_${selectedDocType}`}
                      />
                    </td>
                    <td>{existingPermissions.has(action.permission_key) ? "Exists" : "Missing"}</td>
                    <td>{grants[action.action_key]?.owner ? "Enabled" : "Missing"}</td>
                    <td>{grants[action.action_key]?.admin ? "Enabled" : "Missing"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={saveActions} disabled={saving || !selectedDocType}>
              Save Action Mappings
            </button>
            <button className="logout" type="button" onClick={createMissingAccessKeys} disabled={saving || !selectedDocType}>
              Create Missing Access Keys
            </button>
            <button className="logout" type="button" onClick={enableOwnerAdminAccess} disabled={saving || !selectedDocType}>
              Enable Owner/Admin Access
            </button>
          </div>

          {message && (
            <div className="form-success" style={{ margin: 0 }}>
              {message}
            </div>
          )}

          <div style={{ padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--border-radius-sm)", background: "#f7fafb", fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>
            Permission keys stay scoped to the selected DocType. This builder only auto-grants owner/admin, matching the safe repair behavior from Phase 4.7.
          </div>
        </>
      )}
    </div>
  );
}
