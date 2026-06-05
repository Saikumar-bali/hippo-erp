import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AccessDenied } from "../AccessDenied";
import { PermissionMatrix } from "./PermissionMatrix";
import { getAccessControlMatrix, getRoleDocTypePermlevelMatrix, saveAccessControlMatrix, saveRoleDocTypePermlevels } from "../../lib/access-control-api";
import { groupMatrixRows, type AccessRightKey, type RoleDocTypePermlevelRow } from "../../lib/access-control";
import { ensureCompanyDefaultRoles, listCompanyRoles, saveCompanyRole, type CompanyRole } from "../../lib/roles-api";
import { getCompanyUsers, type CompanyUserRecord } from "../../lib/users-api";

type Props = {
  canViewRoles?: boolean;
  canCreateRole?: boolean;
  canUpdateRole?: boolean;
  initialTargetKey?: string;
};

function toRoleKey(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function AccessControlManagerPage({
  canViewRoles = true,
  canCreateRole = true,
  canUpdateRole = true,
  initialTargetKey = "",
}: Props) {
  const navigate = useNavigate();
  const { tenants, selectedTenantId, setSelectedTenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [users, setUsers] = useState<CompanyUserRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [matrixRows, setMatrixRows] = useState<ReturnType<typeof groupMatrixRows>>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [newRoleName, setNewRoleName] = useState("");
  const [permlevelRows, setPermlevelRows] = useState<RoleDocTypePermlevelRow[]>([]);
  const [permlevelOverrides, setPermlevelOverrides] = useState<Record<number, { can_read: boolean; can_write: boolean }>>({});

  const selectedUser = useMemo(
    () => users.find((user) => user.user_id === selectedUserId) ?? users[0] ?? null,
    [selectedUserId, users],
  );

  const modules = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of matrixRows) {
      if (!seen.has(row.moduleKey)) seen.set(row.moduleKey, row.moduleLabel);
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [matrixRows]);

  const filteredTargets = useMemo(() => matrixRows.filter((target) => {
    if (moduleFilter !== "all" && target.moduleKey !== moduleFilter) return false;
    if (targetFilter === "doctype_only" && target.targetType !== "doctype") return false;
    if (targetFilter === "non_doctype" && target.targetType === "doctype") return false;
    return true;
  }), [matrixRows, moduleFilter, targetFilter]);

  const [selectedTargetId, setSelectedTargetId] = useState("");

  useEffect(() => {
    if (!initialTargetKey) return;
    const preferred = filteredTargets.find((target) => target.targetType === "doctype" && target.targetKey === initialTargetKey);
    if (preferred) setSelectedTargetId(preferred.key);
  }, [filteredTargets, initialTargetKey]);

  useEffect(() => {
    if (!selectedTargetId && filteredTargets.length > 0) {
      setSelectedTargetId(filteredTargets[0].key);
      return;
    }
    if (selectedTargetId && !filteredTargets.some((target) => target.key === selectedTargetId)) {
      setSelectedTargetId(filteredTargets[0]?.key ?? "");
    }
  }, [filteredTargets, selectedTargetId]);

  const selectedTarget = useMemo(() => {
    const target = filteredTargets.find((item) => item.key === selectedTargetId) ?? null;
    if (!target) return null;
    return {
      ...target,
      rights: Object.fromEntries(
        Object.entries(target.rights).map(([rightKey, row]) => {
          if (!row) return [rightKey, row];
          const overrideKey = `${target.key}:${rightKey}`;
          return [rightKey, { ...row, is_granted: overrideKey in overrides ? overrides[overrideKey] : row.is_granted }];
        }),
      ) as typeof target.rights,
    };
  }, [filteredTargets, overrides, selectedTargetId]);

  async function load() {
    if (!selectedTenantId) return;
    setLoading(true);
    try {
      await ensureCompanyDefaultRoles(selectedTenantId);
      const [roleRows, userRows] = await Promise.all([
        listCompanyRoles(selectedTenantId),
        getCompanyUsers(selectedTenantId),
      ]);
      setRoles(roleRows);
      setUsers(userRows);
      const nextRoleId = roleRows.some((role) => role.id === selectedRoleId) ? selectedRoleId : (roleRows[0]?.id ?? "");
      const nextUserId = userRows.some((user) => user.user_id === selectedUserId) ? selectedUserId : (userRows[0]?.user_id ?? "");
      setSelectedRoleId(nextRoleId);
      setSelectedUserId(nextUserId);

      if (nextRoleId) {
        const matrix = await getAccessControlMatrix(selectedTenantId, nextRoleId);
        setMatrixRows(groupMatrixRows(matrix));
      } else {
        setMatrixRows([]);
      }
      setPermlevelRows([]);
      setPermlevelOverrides({});
      setOverrides({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load Access Control Manager");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoleMatrix() {
      if (!selectedTenantId || !selectedRoleId) {
        setMatrixRows([]);
        return;
      }
      try {
        const matrix = await getAccessControlMatrix(selectedTenantId, selectedRoleId);
        if (!cancelled) {
          setMatrixRows(groupMatrixRows(matrix));
          setOverrides({});
        }
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load role matrix");
      }
    }
    void loadRoleMatrix();
    return () => {
      cancelled = true;
    };
  }, [selectedRoleId, selectedTenantId]);

  useEffect(() => {
    let cancelled = false;
    async function loadPermlevels() {
      if (!selectedTenantId || !selectedRoleId || selectedTarget?.targetType !== "doctype") {
        setPermlevelRows([]);
        setPermlevelOverrides({});
        return;
      }
      try {
        const rows = await getRoleDocTypePermlevelMatrix(
          selectedTenantId,
          selectedRoleId,
          selectedTarget.targetKey,
          selectedUser?.user_id ?? null,
        );
        if (!cancelled) {
          setPermlevelRows(rows);
          setPermlevelOverrides({});
        }
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load DocType permission levels");
      }
    }
    void loadPermlevels();
    return () => {
      cancelled = true;
    };
  }, [selectedRoleId, selectedTarget?.targetKey, selectedTarget?.targetType, selectedTenantId, selectedUser?.user_id]);

  async function handleCreateRole() {
    if (!selectedTenantId) return;
    if (!newRoleName.trim()) {
      toast.error("Role name is required.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveCompanyRole({
        tenant_id: selectedTenantId,
        role_name: newRoleName.trim(),
        role_key: toRoleKey(newRoleName),
        permission_keys: [],
      });
      setNewRoleName("");
      toast.success(`Created role ${saved?.role_name ?? newRoleName.trim()}.`);
      await load();
      if (saved?.id) setSelectedRoleId(saved.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create role");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMatrix() {
    if (!selectedTenantId || !selectedRoleId || !selectedTarget) return;
    setSaving(true);
    try {
      const payload = Object.entries(selectedTarget.rights)
        .filter(([, row]) => Boolean(row))
        .map(([rightKey, row]) => ({
          target_type: selectedTarget.targetType,
          target_key: selectedTarget.targetKey,
          workspace_key: selectedTarget.workspaceKey,
          right_key: rightKey,
          permission_key: row!.permission_key,
          is_granted: row!.is_granted,
        }));
      await saveAccessControlMatrix(selectedTenantId, selectedRoleId, payload);
      toast.success(`Saved access rights for ${selectedTarget.label}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save role access");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePermlevels() {
    if (!selectedTenantId || !selectedRoleId || selectedTarget?.targetType !== "doctype") return;
    setSaving(true);
    try {
      const payload = permlevelRows.map((row) => ({
        permlevel: row.permlevel,
        can_read: permlevelOverrides[row.permlevel]?.can_read ?? row.role_can_read,
        can_write: permlevelOverrides[row.permlevel]?.can_write ?? row.role_can_write,
      }));
      await saveRoleDocTypePermlevels(selectedTenantId, selectedRoleId, selectedTarget.targetKey, payload);
      toast.success(`Saved permission levels for ${selectedTarget.label}.`);
      const rows = await getRoleDocTypePermlevelMatrix(
        selectedTenantId,
        selectedRoleId,
        selectedTarget.targetKey,
        selectedUser?.user_id ?? null,
      );
      setPermlevelRows(rows);
      setPermlevelOverrides({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save permission levels");
    } finally {
      setSaving(false);
    }
  }

  if (!canViewRoles) {
    return (
      <AccessDenied
        title="Access Control Manager"
        requiredPermissions={["view_roles"]}
        message="Your current company role can view the company context, but not the access control manager."
      />
    );
  }

  if (!selectedTenantId) {
    return <div className="card state-info">Select a company to manage access.</div>;
  }

  return (
    <div className="studio-shell">
      <div className="studio-header">
        <div>
          <p className="studio-kicker">Role access</p>
          <h3>Access Control Manager</h3>
          <p>
            Choose a role, grant the business rights it needs, and preview what a user can actually do. If a user has multiple roles, their effective rights are the combined permissions from every active role assignment.
          </p>
        </div>
        <div className="studio-toolbar">
          <label className="studio-field" style={{ minWidth: "240px" }}>
            <span>Company</span>
            <select className="studio-control" value={selectedTenantId} onChange={(event) => setSelectedTenantId(event.target.value)}>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>
          <button className="studio-button studio-button--ghost" type="button" onClick={() => void load()} disabled={loading || saving}>
            <RotateCcw size={16} /> Refresh
          </button>
          <button className="studio-button studio-button--ghost" type="button" onClick={() => navigate("/users_and_roles_access_assignments")}>
            Assign users to roles
          </button>
        </div>
      </div>

      {loading ? (
        <div className="state-info">Loading Access Control Manager…</div>
      ) : (
        <div className="acm-layout">
          <aside className="studio-panel acm-roles-panel">
            <div className="studio-icon-title">
              <strong>Roles</strong>
              <span className="mini-badge mini-badge--muted">{roles.length}</span>
            </div>
            <div className="roles-items">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={`role-item ${role.id === selectedRoleId ? "active" : ""}`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <strong>{role.role_name}</strong>
                  <span>{role.role_key}</span>
                  <small>{role.permission_count} rights granted</small>
                </button>
              ))}
            </div>

            {canCreateRole && (
              <div className="studio-stack" style={{ marginTop: "8px" }}>
                <label className="studio-field">
                  <span>Create role</span>
                  <input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="Sales Coordinator" />
                </label>
                <button className="studio-button" type="button" onClick={() => void handleCreateRole()} disabled={saving}>
                  <Plus size={16} /> Create role
                </button>
              </div>
            )}
          </aside>

          <section className="studio-stack">
            <div className="studio-grid studio-grid--two">
              <label className="studio-field">
                <span>Module</span>
                <select className="studio-control" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
                  <option value="all">All modules</option>
                  {modules.map((module) => (
                    <option key={module.value} value={module.value}>
                      {module.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="studio-field">
                <span>Screen type</span>
                <select className="studio-control" value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)}>
                  <option value="all">All targets</option>
                  <option value="doctype_only">Document types only</option>
                  <option value="non_doctype">Pages, reports, and menus</option>
                </select>
              </label>
            </div>

            <div className="studio-grid studio-grid--two">
              <label className="studio-field">
                <span>Select screen or document</span>
                <select className="studio-control" value={selectedTargetId} onChange={(event) => setSelectedTargetId(event.target.value)}>
                  {filteredTargets.map((target) => (
                    <option key={target.key} value={target.key}>
                      {target.moduleLabel} / {target.label} ({target.targetType})
                    </option>
                  ))}
                </select>
              </label>

              <label className="studio-field">
                <span>Preview user effective rights</span>
                <select className="studio-control" value={selectedUser?.user_id ?? ""} onChange={(event) => setSelectedUserId(event.target.value)}>
                  {users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.full_name || user.email} ({user.active_assignment_count} role{user.active_assignment_count === 1 ? "" : "s"})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="studio-panel studio-panel--accent">
              <div className="studio-icon-title">
                <ShieldCheck size={18} />
                <strong>Effective rights explained</strong>
              </div>
              <div className="studio-subtle">
                {selectedUser
                  ? `${selectedUser.full_name || selectedUser.email} can currently use ${selectedUser.effective_permission_count} permission(s), combined across ${selectedUser.active_assignment_count} active role assignment(s). Multiple active roles add together; this preview shows the aggregate access, not only the selected role.`
                  : "Select a user to see the combined rights they receive from all active roles."}
              </div>
              {selectedUser && (
                <div className="permission-chips">
                  {selectedUser.effective_permission_keys.length === 0 ? (
                    <span className="mini-badge mini-badge--muted">No effective rights yet</span>
                  ) : (
                    selectedUser.effective_permission_keys.map((permissionKey) => (
                      <span key={permissionKey} className="permission-pill">{permissionKey}</span>
                    ))
                  )}
                </div>
              )}
            </div>

            <PermissionMatrix
              target={selectedTarget}
              effectivePermissionKeys={selectedUser?.effective_permission_keys ?? []}
              disabled={saving || !canUpdateRole}
              onToggle={(rightKey: AccessRightKey, nextValue: boolean) => {
                if (!selectedTarget) return;
                setOverrides((prev) => ({
                  ...prev,
                  [`${selectedTarget.key}:${rightKey}`]: nextValue,
                }));
              }}
            />

            {selectedTarget?.targetType === "doctype" && permlevelRows.length > 0 && (
              <div className="studio-panel">
                <div className="studio-icon-title">
                  <strong>Field-level permissions</strong>
                </div>
                <div className="studio-subtle">
                  Level 0 = normal fields. Level 1 = sensitive fields. Grant level 1 read/write only where the selected role should see or edit sensitive CRM Lead fields.
                </div>
                <div className="table-wrap" style={{ marginTop: "12px" }}>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Level</th>
                        <th>Fields</th>
                        <th>Role Read</th>
                        <th>Role Write</th>
                        <th>User Read</th>
                        <th>User Write</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permlevelRows.map((row) => {
                        const roleRead = permlevelOverrides[row.permlevel]?.can_read ?? row.role_can_read;
                        const roleWrite = permlevelOverrides[row.permlevel]?.can_write ?? row.role_can_write;
                        return (
                          <tr key={row.permlevel}>
                            <td>
                              <strong>Level {row.permlevel}</strong>
                            </td>
                            <td>{row.field_labels.join(", ") || "No fields"}</td>
                            <td>
                              <input
                                type="checkbox"
                                checked={roleRead}
                                disabled={saving || row.permlevel === 0}
                                onChange={(event) => setPermlevelOverrides((prev) => ({
                                  ...prev,
                                  [row.permlevel]: {
                                    can_read: event.target.checked,
                                    can_write: prev[row.permlevel]?.can_write ?? row.role_can_write,
                                  },
                                }))}
                              />
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={roleWrite}
                                disabled={saving || row.permlevel === 0}
                                onChange={(event) => setPermlevelOverrides((prev) => ({
                                  ...prev,
                                  [row.permlevel]: {
                                    can_read: prev[row.permlevel]?.can_read ?? row.role_can_read,
                                    can_write: event.target.checked,
                                  },
                                }))}
                              />
                            </td>
                            <td>{row.effective_user_can_read ? "Yes" : "No"}</td>
                            <td>{row.effective_user_can_write ? "Yes" : "No"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="studio-toolbar" style={{ justifyContent: "space-between" }}>
                  <div className="studio-subtle">
                    Level 0 inherits standard DocType read/create/update rights. Higher levels are explicit grants.
                  </div>
                  <button className="studio-button" type="button" onClick={() => void handleSavePermlevels()} disabled={saving || !canUpdateRole}>
                    {saving ? "Saving..." : "Save field-level access"}
                  </button>
                </div>
              </div>
            )}

            <div className="studio-toolbar" style={{ justifyContent: "space-between" }}>
              <div className="studio-subtle">
                When a user sees Access required, find this screen or document, turn on the needed right for one of their roles, then save.
              </div>
              <button className="studio-button" type="button" onClick={() => void handleSaveMatrix()} disabled={saving || !selectedTarget || !selectedRoleId || !canUpdateRole}>
                {saving ? "Saving..." : "Save role access"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
