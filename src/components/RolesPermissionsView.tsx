import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { AccessDenied } from "./AccessDenied";
import { PermissionMatrix } from "./PermissionMatrix";
import { groupPermissions, type PermissionCatalogRecord } from "../lib/permissions";
import {
  deleteCompanyRole,
  ensureCompanyDefaultRoles,
  getCompanyRolePermissions,
  getPermissionCatalog,
  listCompanyRoles,
  saveCompanyRole,
  type CompanyRole
} from "../lib/roles-api";

const blankRole = {
  id: null as string | null,
  role_key: "",
  role_name: "",
  description: "",
  sort_order: 0
};

type Props = {
  canViewRoles?: boolean;
  canCreateRole?: boolean;
  canUpdateRole?: boolean;
  canDeleteRole?: boolean;
};

export function RolesPermissionsView({
  canViewRoles = true,
  canCreateRole = true,
  canUpdateRole = true,
  canDeleteRole = true
}: Props) {
  const { selectedTenantId, tenants } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<PermissionCatalogRecord[]>([]);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editing, setEditing] = useState({
    id: null as string | null,
    role_key: "",
    role_name: "",
    description: "",
    sort_order: 0
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [creatingNew, setCreatingNew] = useState(false);

  const groupedPermissions = useMemo(() => groupPermissions(permissions), [permissions]);
  const selectedRole = useMemo(() => roles.find((role) => role.id === selectedRoleId) ?? null, [roles, selectedRoleId]);
  const currentMembershipRole = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId)?.role ?? "",
    [tenants, selectedTenantId]
  );
  const formLocked = !canUpdateRole && !creatingNew;
  const lockPermissionMatrix = Boolean(
    selectedRole &&
      selectedRole.is_system &&
      selectedRole.role_key === currentMembershipRole &&
      (currentMembershipRole === "admin" || currentMembershipRole === "owner")
  );

  useEffect(() => {
    const run = async () => {
      if (!selectedTenantId) return;
      setLoading(true);
      try {
        await ensureCompanyDefaultRoles(selectedTenantId);
        const [permissionRows, roleRows] = await Promise.all([
          getPermissionCatalog(),
          listCompanyRoles(selectedTenantId)
        ]);
        setPermissions(permissionRows);
        setRoles(roleRows);
        const firstRole = roleRows[0] ?? null;
        setSelectedRoleId(firstRole?.id ?? null);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to load roles.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [selectedTenantId]);

  useEffect(() => {
    const loadRolePermissions = async () => {
      if (!selectedRoleId) {
        setEditing(blankRole);
        setSelectedPermissions(new Set());
        return;
      }
      const role = roles.find((item) => item.id === selectedRoleId);
      if (!role) return;
      setEditing({
        id: role.id,
        role_key: role.role_key,
        role_name: role.role_name,
        description: role.description ?? "",
        sort_order: role.sort_order
      });
      try {
        const rows = await getCompanyRolePermissions(role.id);
        setSelectedPermissions(new Set(rows.map((row) => row.permission_key)));
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to load role permissions.");
      }
    };
    void loadRolePermissions();
  }, [roles, selectedRoleId]);

  const startCreate = () => {
    setCreatingNew(true);
    setSelectedRoleId(null);
    setEditing({
      id: null,
      role_key: "",
      role_name: "",
      description: "",
      sort_order: 0
    });
    setSelectedPermissions(new Set());
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    if (!selectedTenantId) return;
    setSaving(true);
    try {
      const saved = await saveCompanyRole({
        id: editing.id,
        tenant_id: selectedTenantId,
        role_key: editing.role_key,
        role_name: editing.role_name,
        description: editing.description,
        sort_order: editing.sort_order,
        is_system: selectedRole?.is_system ?? false,
        permission_keys: [...selectedPermissions]
      });
      const roleRows = await listCompanyRoles(selectedTenantId);
      setRoles(roleRows);
      setSelectedRoleId(saved?.id ?? roleRows[0]?.id ?? null);
      setCreatingNew(false);
      toast.success("Role saved successfully.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save role.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selectedRole) return;
    if (!window.confirm(`Delete role "${selectedRole.role_name}"?`)) return;
    setSaving(true);
    try {
      await deleteCompanyRole(selectedRole.id);
      const roleRows = await listCompanyRoles(selectedTenantId!);
      setRoles(roleRows);
      setSelectedRoleId(roleRows[0]?.id ?? null);
      setCreatingNew(false);
      toast.success("Role deleted.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete role.");
    } finally {
      setSaving(false);
    }
  };

  if (!selectedTenantId) {
    return <div className="card state-info">Select a company to manage roles.</div>;
  }

  if (!canViewRoles) {
    return (
      <AccessDenied
        title="Company roles"
        requiredPermissions={["view_roles"]}
        message="Your current company role can view the company context, but not the role management screen."
      />
    );
  }

  return (
    <div className="module-stack roles-layout">
      {loading && <div className="card state-info">Loading roles and permissions...</div>}

      {!loading && (
        <div className="roles-shell">
          <aside className="card roles-list">
            <div className="roles-list-head">
              <div>
                <h3>Roles</h3>
                <p>{roles.length} role{roles.length === 1 ? "" : "s"}</p>
              </div>
              {canCreateRole ? (
                <button className="primary-action" type="button" onClick={startCreate}>
                  <Plus size={16} /> New Role
                </button>
              ) : (
                <span className="mini-badge mini-badge--muted">View only</span>
              )}
            </div>
            <div className="roles-items">
              {roles.map((role) => {
                const active = role.id === selectedRoleId && !creatingNew;
                return (
                  <button
                    key={role.id}
                    type="button"
                    className={`role-item ${active ? "active" : ""}`}
                    onClick={() => {
                      setCreatingNew(false);
                      setSelectedRoleId(role.id);
                    }}
                  >
                    <strong>{role.role_name}</strong>
                    <span>{role.role_key}</span>
                    <small>{role.assignment_count} users</small>
                    {role.is_system && <em>System</em>}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="card role-editor">
            <div className="role-editor-head">
              <div>
                <p className="eyebrow">Company roles</p>
                <h3>{creatingNew ? "Create role" : selectedRole?.role_name ?? "Role details"}</h3>
              </div>
              {selectedRole && !selectedRole.is_system && !creatingNew && canDeleteRole && (
                <button className="logout" type="button" onClick={remove} disabled={saving}>
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>

            <div className="role-form-grid">
              <label>
                <span>Role name</span>
                <input
                  value={editing.role_name}
                  onChange={(e) => setEditing((prev) => ({ ...prev, role_name: e.target.value }))}
                  placeholder="Role name"
                  disabled={formLocked}
                />
              </label>
              <label>
                <span>Role key</span>
                <input
                  value={editing.role_key}
                  onChange={(e) => setEditing((prev) => ({ ...prev, role_key: e.target.value }))}
                  placeholder="role_key"
                  disabled={formLocked || (!creatingNew && !!selectedRole)}
                />
              </label>
              <label>
                <span>Sort order</span>
                <input
                  value={editing.sort_order}
                  onChange={(e) => setEditing((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
                  type="number"
                  disabled={formLocked}
                />
              </label>
              <label className="role-description">
                <span>Description</span>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this role"
                  rows={3}
                  disabled={formLocked}
                />
              </label>
            </div>

            <div className="role-matrix-head">
              <div>
                <p className="eyebrow">Permission matrix</p>
                <h4>{selectedPermissions.size} selected</h4>
                {lockPermissionMatrix && (
                  <p className="role-lock-note">Your current company role is locked to prevent self-lockout.</p>
                )}
              </div>
              <button className="primary-action" type="button" onClick={() => void save()} disabled={saving || (!canUpdateRole && !creatingNew)}>
                {saving ? "Saving..." : "Save Role"}
              </button>
            </div>

            <PermissionMatrix
              groups={groupedPermissions}
              selected={selectedPermissions}
              onToggle={togglePermission}
              disabled={saving || lockPermissionMatrix || !canUpdateRole}
            />
          </section>
        </div>
      )}
    </div>
  );
}
