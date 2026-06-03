import { useEffect, useState } from "react";
import { ShieldCheck, ShieldUser, Users } from "lucide-react";
import { AccessDenied } from "./AccessDenied";
import { RolesPermissionsView } from "./RolesPermissionsView";
import { UserRoleAssignment } from "./UserRoleAssignment";
import { UserRoleAssignmentPage } from "./permissions/UserRoleAssignmentPage";

type TabKey = "roles" | "users" | "access_assignments";

type Props = {
  canViewUsers?: boolean;
  canViewRoles?: boolean;
  canAssignRole?: boolean;
  canInviteUser?: boolean;
  canDeactivateUser?: boolean;
  canCreateRole?: boolean;
  canUpdateRole?: boolean;
  canDeleteRole?: boolean;
  initialTab?: TabKey;
};

export function UsersRolesView({
  canViewUsers = true,
  canViewRoles = true,
  canAssignRole = true,
  canInviteUser = true,
  canDeactivateUser = true,
  canCreateRole = true,
  canUpdateRole = true,
  canDeleteRole = true,
  initialTab = canViewRoles ? "roles" : "users"
}: Props) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const hasRolesTab = canViewRoles;
  const hasUsersTab = canViewUsers;
  const hasAccessAssignmentsTab = canViewUsers;

  useEffect(() => {
    if (tab === "roles" && !hasRolesTab && hasUsersTab) {
      setTab("users");
    }
    if (tab === "users" && !hasUsersTab && hasRolesTab) {
      setTab("roles");
    }
    if (tab === "access_assignments" && !hasAccessAssignmentsTab) {
      setTab(hasRolesTab ? "roles" : "users");
    }
  }, [hasAccessAssignmentsTab, hasRolesTab, hasUsersTab, tab]);

  if (!hasRolesTab && !hasUsersTab) {
    return <AccessDenied title="Users and roles" requiredPermissions={["view_users", "view_roles"]} />;
  }

  return (
    <div className="users-roles-screen">
      <div className="users-roles-tabs" role="tablist" aria-label="Users and roles">
        {hasRolesTab && (
          <button type="button" className={`users-roles-tab ${tab === "roles" ? "active" : ""}`} onClick={() => setTab("roles")} role="tab" aria-selected={tab === "roles"}>
            <ShieldUser size={14} /> Roles
          </button>
        )}
        {hasUsersTab && (
          <button type="button" className={`users-roles-tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")} role="tab" aria-selected={tab === "users"}>
            <Users size={14} /> Users
          </button>
        )}
        {hasAccessAssignmentsTab && (
          <button type="button" className={`users-roles-tab ${tab === "access_assignments" ? "active" : ""}`} onClick={() => setTab("access_assignments")} role="tab" aria-selected={tab === "access_assignments"}>
            <ShieldCheck size={14} /> Access Assignments
          </button>
        )}
      </div>
      <div className="users-roles-content">
        {tab === "roles" ? (
          <RolesPermissionsView canViewRoles={canViewRoles} canCreateRole={canCreateRole} canUpdateRole={canUpdateRole} canDeleteRole={canDeleteRole} />
        ) : tab === "users" ? (
          <UserRoleAssignment canViewUsers={canViewUsers} canAssignRole={canAssignRole} canInviteUser={canInviteUser} canDeactivateUser={canDeactivateUser} />
        ) : (
          <UserRoleAssignmentPage canViewUsers={canViewUsers} canAssignRole={canAssignRole} canInviteUser={canInviteUser} canDeactivateUser={canDeactivateUser} />
        )}
      </div>
    </div>
  );
}
