import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CirclePlus, RotateCcw, ShieldUser, UserMinus2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { AccessDenied } from "../AccessDenied";
import { InviteUserForm } from "../InviteUserForm";
import { buildMissingRightsDiagnostics, groupMatrixRows } from "../../lib/access-control";
import { getAccessControlMatrix, getCompanyUserRoleAssignments, setCompanyUserRoles } from "../../lib/access-control-api";
import { ensureCompanyDefaultRoles, getPermissionCatalog, listCompanyRoles, type CompanyRole } from "../../lib/roles-api";
import { cancelCompanyInvite, getCompanyInvites, getCompanyUsers, removeCompanyUser, type CompanyInviteRecord, type CompanyUserRecord } from "../../lib/users-api";
import type { PermissionCatalogRecord } from "../../lib/permissions";

type Props = {
  canViewUsers?: boolean;
  canAssignRole?: boolean;
  canInviteUser?: boolean;
  canDeactivateUser?: boolean;
};

export function UserRoleAssignmentPage({
  canViewUsers = true,
  canAssignRole = true,
  canInviteUser = true,
  canDeactivateUser = true,
}: Props) {
  const { tenants, selectedTenantId, setSelectedTenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [users, setUsers] = useState<CompanyUserRecord[]>([]);
  const [invites, setInvites] = useState<CompanyInviteRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionCatalogRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [targetRows, setTargetRows] = useState<ReturnType<typeof groupMatrixRows>>([]);

  const permissionLabelMap = useMemo(
    () => new Map(permissions.map((permission) => [permission.permission_key, permission.permission_label])),
    [permissions],
  );

  const selectedUser = useMemo(
    () => users.find((user) => user.user_id === selectedUserId) ?? users[0] ?? null,
    [selectedUserId, users],
  );

  const selectedTarget = useMemo(
    () => targetRows.find((target) => target.key === selectedTargetId) ?? targetRows[0] ?? null,
    [selectedTargetId, targetRows],
  );

  async function load() {
    if (!selectedTenantId) return;
    setLoading(true);
    try {
      await ensureCompanyDefaultRoles(selectedTenantId);
      const [roleRows, userRows, inviteRows, permissionRows, matrix] = await Promise.all([
        listCompanyRoles(selectedTenantId),
        getCompanyUsers(selectedTenantId),
        getCompanyInvites(selectedTenantId),
        getPermissionCatalog(),
        getAccessControlMatrix(selectedTenantId, null),
      ]);
      setRoles(roleRows);
      setUsers(userRows);
      setInvites(inviteRows);
      setPermissions(permissionRows);
      setSelectedUserId((current) => userRows.some((user) => user.user_id === current) ? current : (userRows[0]?.user_id ?? ""));
      const grouped = groupMatrixRows(matrix);
      setTargetRows(grouped);
      setSelectedTargetId((current) => grouped.some((item) => item.key === current) ? current : (grouped[0]?.key ?? ""));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load user role assignments");
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
    async function loadAssignments() {
      if (!selectedTenantId || !selectedUser?.user_id) {
        setSelectedRoleIds([]);
        return;
      }
      try {
        const assignments = await getCompanyUserRoleAssignments(selectedTenantId, selectedUser.user_id);
        if (!cancelled) {
          setSelectedRoleIds(assignments.filter((item) => item.is_active).map((item) => item.role_id));
        }
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load user role assignments");
      }
    }
    void loadAssignments();
    return () => {
      cancelled = true;
    };
  }, [selectedTenantId, selectedUser?.user_id]);

  async function handleSave() {
    if (!selectedTenantId || !selectedUser) return;
    if (!selectedUser.is_active) {
      toast.error("Inactive users cannot receive company roles.");
      return;
    }
    setSaving(true);
    try {
      await setCompanyUserRoles(selectedTenantId, selectedUser.user_id, selectedRoleIds);
      toast.success(`Updated role assignments for ${selectedUser.full_name || selectedUser.email}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save role assignments");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveUser() {
    if (!selectedTenantId || !selectedUser) return;
    if (!window.confirm(`Remove ${selectedUser.full_name || selectedUser.email} from this company?`)) return;
    setSaving(true);
    try {
      await removeCompanyUser(selectedTenantId, selectedUser.user_id);
      toast.success(`${selectedUser.full_name || selectedUser.email} was removed from the company.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove company user");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelInvite(invite: CompanyInviteRecord) {
    if (!selectedTenantId) return;
    setSaving(true);
    try {
      await cancelCompanyInvite(selectedTenantId, invite.email);
      toast.success(`Cancelled invite for ${invite.email}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel invite");
    } finally {
      setSaving(false);
    }
  }

  const diagnostics = buildMissingRightsDiagnostics(selectedTarget, selectedUser?.effective_permission_keys ?? []);

  if (!canViewUsers) {
    return (
      <AccessDenied
        title="User Role Assignment"
        requiredPermissions={["view_users"]}
        message="Your current company role can see the company context, but not the user assignment screen."
      />
    );
  }

  if (!selectedTenantId) {
    return <div className="card state-info">Select a company to manage user assignments.</div>;
  }

  return (
    <div className="studio-shell">
      <div className="studio-header">
        <div>
          <p className="studio-kicker">Company Access</p>
          <h3>User Role Assignment</h3>
          <p>
            Assign one or more company roles per user, preview their effective rights, and diagnose what is still missing for a selected target.
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
        </div>
      </div>

      {loading ? (
        <div className="state-info">Loading user assignments…</div>
      ) : (
        <>
          <InviteUserForm
            companyId={selectedTenantId}
            roles={roles}
            canInviteUser={canInviteUser}
            onInvited={load}
            companyName={tenants.find((tenant) => tenant.id === selectedTenantId)?.name ?? "Current company"}
            membershipRole={tenants.find((tenant) => tenant.id === selectedTenantId)?.role ?? "admin"}
          />

          <div className="studio-grid studio-grid--two">
            <section className="studio-panel">
              <div className="studio-icon-title">
                <CirclePlus size={18} />
                <strong>Pending Invitations</strong>
                <span className="mini-badge mini-badge--muted">{invites.length}</span>
              </div>
              {invites.length === 0 ? (
                <div className="studio-subtle">No pending invitations right now.</div>
              ) : (
                <div className="pending-invites">
                  {invites.map((invite) => (
                    <article key={invite.invite_id} className="pending-invite">
                      <div>
                        <strong>{invite.full_name}</strong>
                        <p>{invite.email}</p>
                        <div className="user-item-meta">
                          <small>Membership: {invite.membership_role}</small>
                          <small>{invite.company_role_name ?? "No default role"}</small>
                        </div>
                      </div>
                      <button className="logout" type="button" onClick={() => void handleCancelInvite(invite)} disabled={saving || !canInviteUser}>
                        Cancel
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="studio-panel">
              <div className="studio-icon-title">
                <strong>Diagnostics Target</strong>
              </div>
              <label className="studio-field">
                <span>Selected target</span>
                <select className="studio-control" value={selectedTarget?.key ?? ""} onChange={(event) => setSelectedTargetId(event.target.value)}>
                  {targetRows.map((target) => (
                    <option key={target.key} value={target.key}>
                      {target.moduleLabel} / {target.label} ({target.targetType})
                    </option>
                  ))}
                </select>
              </label>
              <div className="studio-subtle">
                Diagnostics compare the selected user’s current effective permission set against the selected DocType, page, report, or menu target.
              </div>
            </section>
          </div>

          <div className="users-shell">
            <aside className="studio-panel users-list">
              <div className="users-list-head">
                <div>
                  <h3>Company Users</h3>
                  <p>{users.length} member{users.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              <div className="users-items">
                {users.map((user) => (
                  <button
                    key={user.user_id}
                    type="button"
                    className={`user-item ${selectedUser?.user_id === user.user_id ? "active" : ""} ${!user.is_active ? "is-inactive" : ""}`}
                    onClick={() => setSelectedUserId(user.user_id)}
                  >
                    <strong>{user.full_name || user.email}</strong>
                    <span>{user.email}</span>
                    <div className="user-item-meta">
                      <small>Membership: {user.membership_role}</small>
                      <small>{user.active_assignment_count} active role{user.active_assignment_count === 1 ? "" : "s"}</small>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="studio-panel user-detail">
              <div className="user-detail-head">
                <div>
                  <p className="eyebrow">Role assignments</p>
                  <h3>{selectedUser ? selectedUser.full_name || selectedUser.email : "Select a user"}</h3>
                  {selectedUser && <p className="user-detail-subtitle">{selectedUser.email}</p>}
                </div>
              </div>

              {selectedUser && (
                <>
                  <div className="studio-grid studio-grid--two">
                    {roles.map((role) => {
                      const checked = selectedRoleIds.includes(role.id);
                      return (
                        <label key={role.id} className="studio-check" style={{ justifyContent: "space-between" }}>
                          <span>
                            {role.role_name}
                            <span className="studio-subtle" style={{ marginLeft: "8px" }}>{role.role_key}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={saving || !selectedUser.is_active || !canAssignRole}
                            onChange={(event) => {
                              setSelectedRoleIds((prev) => event.target.checked
                                ? [...prev, role.id]
                                : prev.filter((item) => item !== role.id));
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="assignment-actions">
                    <button className="studio-button" type="button" onClick={() => void handleSave()} disabled={saving || !canAssignRole}>
                      <ShieldUser size={16} /> {saving ? "Saving..." : "Save Assignments"}
                    </button>
                    <button className="studio-button studio-button--ghost" type="button" onClick={() => setSelectedRoleIds([])} disabled={saving || !canAssignRole}>
                      <CheckCircle2 size={16} /> Clear All Roles
                    </button>
                    <button className="logout logout--danger" type="button" onClick={() => void handleRemoveUser()} disabled={saving || !canDeactivateUser}>
                      <UserMinus2 size={16} /> Remove From Company
                    </button>
                  </div>

                  <div className="user-assignment-meta">
                    <article>
                      <h4>Effective rights</h4>
                      <p>{selectedUser.effective_permission_count} permission(s)</p>
                    </article>
                    <article>
                      <h4>Assigned roles</h4>
                      <p>{selectedRoleIds.length} active role(s)</p>
                    </article>
                    <article>
                      <h4>Missing diagnostics</h4>
                      <p>{diagnostics.length === 0 ? "No missing rights" : `${diagnostics.length} missing for selected target`}</p>
                    </article>
                  </div>

                  <div className="permission-chips">
                    {selectedUser.effective_permission_keys.length === 0 ? (
                      <span className="mini-badge mini-badge--muted">No effective permissions yet</span>
                    ) : (
                      selectedUser.effective_permission_keys.map((permissionKey) => (
                        <span key={permissionKey} className="permission-pill" title={permissionLabelMap.get(permissionKey) ?? permissionKey}>
                          {permissionLabelMap.get(permissionKey) ?? permissionKey}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="studio-panel studio-panel--warm">
                    <div className="studio-icon-title">
                      <strong>Missing Access Diagnostics</strong>
                    </div>
                    {diagnostics.length === 0 ? (
                      <div className="studio-subtle">The selected user already has all configured rights for {selectedTarget?.label ?? "this target"}.</div>
                    ) : (
                      <div className="permission-chips">
                        {diagnostics.map((item) => (
                          <span key={`${item.rightKey}:${item.permissionKey}`} className="permission-pill">
                            {item.rightKey}: {item.permissionKey}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
