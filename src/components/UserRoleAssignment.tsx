import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CirclePlus, RotateCcw, ShieldUser, UserMinus2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { AccessDenied } from "./AccessDenied";
import { InviteUserForm } from "./InviteUserForm";
import { ensureCompanyDefaultRoles, getPermissionCatalog, listCompanyRoles, type CompanyRole } from "../lib/roles-api";
import type { PermissionCatalogRecord } from "../lib/permissions";
import {
  cancelCompanyInvite,
  getCompanyInvites,
  getCompanyUsers,
  removeCompanyUser,
  setCompanyUserRole,
  type CompanyInviteRecord,
  type CompanyUserRecord
} from "../lib/users-api";

type Props = {
  canViewUsers?: boolean;
  canAssignRole?: boolean;
  canInviteUser?: boolean;
  canDeactivateUser?: boolean;
};

type ConfirmAction =
  | { kind: "remove-user"; user: CompanyUserRecord }
  | { kind: "cancel-invite"; invite: CompanyInviteRecord }
  | null;

export function UserRoleAssignment({ canViewUsers = true, canAssignRole = true, canInviteUser = true, canDeactivateUser = true }: Props) {
  const { selectedTenantId, tenants } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingInvite, setWorkingInvite] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [users, setUsers] = useState<CompanyUserRecord[]>([]);
  const [invites, setInvites] = useState<CompanyInviteRecord[]>([]);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [permissions, setPermissions] = useState<PermissionCatalogRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const permissionLabelMap = useMemo(
    () => new Map(permissions.map((permission) => [permission.permission_key, permission.permission_label])),
    [permissions]
  );

  const selectedUser = useMemo(
    () => users.find((user) => user.user_id === selectedUserId) ?? users[0] ?? null,
    [users, selectedUserId]
  );

  const selectedCompany = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenants]
  );

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].user_id);
      return;
    }
    if (selectedUserId && !users.some((user) => user.user_id === selectedUserId)) {
      setSelectedUserId(users[0]?.user_id ?? null);
    }
  }, [users, selectedUserId]);

  useEffect(() => {
    setSelectedRoleId(selectedUser?.assigned_role_id ?? "");
  }, [selectedUser?.assigned_role_id, selectedUser?.user_id]);

  const load = async () => {
    if (!selectedTenantId) return;
    setLoading(true);
    try {
      await ensureCompanyDefaultRoles(selectedTenantId);
      const [permissionRows, roleRows, userRows, inviteRows] = await Promise.all([
        getPermissionCatalog(),
        listCompanyRoles(selectedTenantId),
        getCompanyUsers(selectedTenantId),
        getCompanyInvites(selectedTenantId)
      ]);
      setPermissions(permissionRows);
      setRoles(roleRows);
      setUsers(userRows);
      setInvites(inviteRows);
      if (!selectedUserId) {
        setSelectedUserId(userRows[0]?.user_id ?? null);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load company users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  const save = async () => {
    if (!selectedTenantId || !selectedUser) return;
    if (!selectedUser.is_active) {
      toast.error("Inactive users cannot be assigned a company role.");
      return;
    }
    setSaving(true);
    try {
      const saved = await setCompanyUserRole({
        companyId: selectedTenantId,
        userId: selectedUser.user_id,
        roleId: selectedRoleId || null
      });
      const userRows = await getCompanyUsers(selectedTenantId);
      setUsers(userRows);
      setSelectedUserId(saved?.user_id ?? selectedUser.user_id);
      toast.success(
        selectedRoleId
          ? `Assigned ${saved?.assigned_role_name ?? "role"} to ${selectedUser.full_name || selectedUser.email}.`
          : `Cleared company role for ${selectedUser.full_name || selectedUser.email}.`
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update the user role.");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (user: CompanyUserRecord) => {
    if (!selectedTenantId || !canDeactivateUser) return;

    setSaving(true);
    try {
      await removeCompanyUser(selectedTenantId, user.user_id);
      await load();
      if (selectedUserId === user.user_id) {
        setSelectedUserId(users.find((item) => item.user_id !== user.user_id)?.user_id ?? null);
      }
      toast.success(`${user.full_name || user.email} was removed from the company.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to remove the user from the company.");
    } finally {
      setSaving(false);
    }
  };

  const cancelInvite = async (invite: CompanyInviteRecord) => {
    if (!selectedTenantId || !canInviteUser) return;

    setWorkingInvite(true);
    try {
      await cancelCompanyInvite(selectedTenantId, invite.email);
      await load();
      toast.success(`Cancelled invite for ${invite.email}.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to cancel the invite.");
    } finally {
      setWorkingInvite(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    if (action.kind === "remove-user") {
      await removeUser(action.user);
      return;
    }
    await cancelInvite(action.invite);
  };

  if (!selectedTenantId) {
    return <div className="card state-info">Select a company to manage users.</div>;
  }

  if (!canViewUsers) {
    return (
      <AccessDenied
        title="Company users"
        requiredPermissions={["view_users"]}
        message="Your current company role can see the company context, but not the user management screen."
      />
    );
  }

  return (
    <div className="module-stack users-layout">
      {loading && <div className="card state-info">Loading company users...</div>}

      {!loading && (
        <>
          <InviteUserForm
            companyId={selectedTenantId}
            roles={roles}
            canInviteUser={canInviteUser}
            onInvited={load}
            companyName={selectedCompany?.name ?? "Current company"}
            membershipRole={selectedCompany?.role ?? "admin"}
          />

          <section className="card invite-card">
            <div className="invite-card-head">
              <div className="invite-card-title">
                <div className="invite-card-kicker">
                  <span className="invite-card-icon">
                    <CirclePlus size={14} />
                  </span>
                  <span>Invitation queue</span>
                </div>
                <h3>Pending invitations</h3>
                <p>Invites stay here until the invited user opens the email, sets a password, and completes setup.</p>
              </div>
              <span className="mini-badge mini-badge--muted">{invites.length} pending</span>
            </div>

            {invites.length === 0 ? (
              <div className="card state-info state-note">No pending invitations. New invites will appear here until accepted.</div>
            ) : (
              <div className="pending-invites">
                {invites.map((invite) => (
                  <article key={invite.invite_id} className="pending-invite">
                    <div>
                      <strong>{invite.full_name}</strong>
                      <p>{invite.email}</p>
                      <div className="user-item-meta">
                        <small>Membership: {invite.membership_role}</small>
                        <small>{invite.company_role_name ?? "No company role"}</small>
                      </div>
                    </div>
                    <div className="user-badges">
                      <span className="mini-badge mini-badge--muted">{invite.invite_status}</span>
                      <button className="logout" type="button" onClick={() => setConfirmAction({ kind: "cancel-invite", invite })} disabled={workingInvite || !canInviteUser}>
                        Cancel
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="users-shell">
          <aside className="card users-list">
            <div className="users-list-head">
              <div>
                <h3>Company users</h3>
                <p>{users.length} member{users.length === 1 ? "" : "s"}</p>
              </div>
              <button className="primary-action" type="button" onClick={() => void load()} disabled={saving}>
                <RotateCcw size={14} /> Refresh
              </button>
            </div>

            <div className="users-items">
              {users.map((user) => {
                const active = user.user_id === selectedUserId;
                return (
                  <button
                    key={user.user_id}
                    type="button"
                    className={`user-item ${active ? "active" : ""} ${!user.is_active ? "is-inactive" : ""}`}
                    onClick={() => setSelectedUserId(user.user_id)}
                  >
                    <strong>{user.full_name || user.email}</strong>
                    <span>{user.email}</span>
                    <div className="user-item-meta">
                      <small>Membership: {user.membership_role}</small>
                      <small>{user.assigned_role_name ?? "No company role"}</small>
                    </div>
                    <div className="user-badges">
                      <span className={`mini-badge ${user.is_active ? "mini-badge--ok" : "mini-badge--off"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className={`mini-badge ${user.assigned_role_name ? "mini-badge--role" : "mini-badge--muted"}`}>
                        {user.assigned_role_name ?? "No role"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="card user-detail">
            <div className="user-detail-head">
              <div>
                <p className="eyebrow">User role assignment</p>
                <h3>{selectedUser ? selectedUser.full_name || selectedUser.email : "Select a user"}</h3>
                {selectedUser && <p className="user-detail-subtitle">{selectedUser.email}</p>}
              </div>
              <div className="user-detail-stats">
                <span className="mini-badge mini-badge--muted">{selectedUser?.membership_role ?? "-"}</span>
                <span className="mini-badge mini-badge--role">{selectedUser?.assigned_role_name ?? "No company role"}</span>
              </div>
            </div>

            {!selectedUser && <div className="state-info card state-note">No users found for this company.</div>}

            {selectedUser && (
              <>
                <div className="assignment-form">
                  <label className="assignment-field">
                    <span>Company role</span>
                    <select
                      value={selectedRoleId}
                      onChange={(event) => setSelectedRoleId(event.target.value)}
                      disabled={saving || !selectedUser.is_active || !canAssignRole}
                    >
                      <option value="">No company role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id} disabled={!role.is_active}>
                          {role.role_name} {role.is_system ? "(System)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="assignment-actions">
                    <button className="primary-action" type="button" onClick={() => void save()} disabled={saving || !selectedUser.is_active || !canAssignRole}>
                      <ShieldUser size={14} /> {saving ? "Saving..." : "Save Assignment"}
                    </button>
                    <button
                      className="logout"
                      type="button"
                      onClick={() => setConfirmAction({ kind: "remove-user", user: selectedUser })}
                      disabled={saving || !selectedUser.is_active || !canDeactivateUser}
                    >
                      <UserMinus2 size={14} /> Remove from company
                    </button>
                    <button
                      className="logout"
                      type="button"
                      onClick={() => setSelectedRoleId("")}
                      disabled={saving || !selectedUser.is_active || !canAssignRole}
                    >
                      <CheckCircle2 size={14} /> Clear Role
                    </button>
                  </div>
                </div>

                <div className="user-assignment-meta">
                  <article>
                    <h4>Membership status</h4>
                    <p>{selectedUser.is_active ? "Active company member" : "Inactive member"}</p>
                  </article>
                  <article>
                    <h4>Company role</h4>
                    <p>{selectedUser.assigned_role_name ?? "No company role assigned"}</p>
                  </article>
                  <article>
                    <h4>Effective permissions</h4>
                    <p>{selectedUser.effective_permission_count} permissions</p>
                  </article>
                </div>

                <div className="user-permissions">
                  {selectedUser.effective_permission_keys.length === 0 ? (
                    <div className="card state-info state-note">No effective permissions yet. Assign a company role to grant access.</div>
                  ) : (
                    selectedUser.effective_permission_keys.map((permissionKey) => (
                      <span key={permissionKey} className="permission-pill" title={permissionLabelMap.get(permissionKey) ?? permissionKey}>
                        {permissionLabelMap.get(permissionKey) ?? permissionKey}
                      </span>
                    ))
                  )}
                </div>

                {!selectedUser.is_active && (
                  <div className="card state-info state-note">This user is inactive. Reactivate the company membership before assigning a role.</div>
                )}

                {!canAssignRole && (
                  <div className="card state-info state-note">You can review user access, but your current company role cannot change assignments.</div>
                )}

                {!canDeactivateUser && (
                  <div className="card state-info state-note">Your current company role cannot remove users from this company.</div>
                )}
              </>
            )}
          </section>
          </div>

          {confirmAction && (
            <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Confirm action">
              <div className="confirm-card">
                <div className="confirm-head">
                  <div className="confirm-icon">
                    <AlertTriangle size={18} />
                  </div>
                  <button type="button" className="icon-button" onClick={() => setConfirmAction(null)} aria-label="Close confirmation">
                    <X size={16} />
                  </button>
                </div>

                <div className="confirm-body">
                  <h3>{confirmAction.kind === "remove-user" ? "Remove company access?" : "Cancel pending invitation?"}</h3>
                  <p>
                    {confirmAction.kind === "remove-user"
                      ? `This will permanently remove ${confirmAction.user.full_name || confirmAction.user.email} from this company. Their login remains intact, but their company membership and role assignment are deleted.`
                      : `This will cancel the pending invitation for ${confirmAction.invite.email}. The invite link will no longer grant company access.`}
                  </p>
                </div>

                <div className="confirm-actions">
                  <button type="button" className="logout" onClick={() => setConfirmAction(null)} disabled={saving || workingInvite}>
                    Cancel
                  </button>
                  <button type="button" className="primary-action" onClick={() => void handleConfirm()} disabled={saving || workingInvite}>
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
