import type { WorkspaceItemMeta } from "../../lib/metadata/workspace-types";
import type { PermissionChecker } from "../../lib/permission-access";
import { DynamicListPage } from "./DynamicListPage";
import { CompanyProfileView } from "../CompanyProfileView";
import { UsersRolesView } from "../UsersRolesView";
import { MetadataPrototype } from "../MetadataPrototype";
import { ModuleView } from "../ModuleView";

type Props = {
  selectedItem: WorkspaceItemMeta | null;
  tenantId: string;
  permissions: PermissionChecker;
};

const can = (fn: (key: string) => boolean) => (required: string | readonly string[]) => {
  if (typeof required === "string") return fn(required);
  return required.some((k) => fn(k));
};

export function DynamicRouteRenderer({ selectedItem, tenantId, permissions }: Props) {
  if (!selectedItem) {
    return (
      <div className="card state-info">
        <h3>Hippo ERP</h3>
        <p>Select a workspace item from the sidebar to get started.</p>
      </div>
    );
  }

  const { item_type: itemType, target, item_key: itemKey } = selectedItem;

  if (itemType === "doctype") {
    return (
      <DynamicListPage
        doctypeKey={target}
        tenantId={tenantId}
        canUpdate={permissions.can("update_product")}
        canDelete={permissions.can("delete_product")}
        permissionChecker={(key: string) => permissions.can(key)}
      />
    );
  }

  if (itemType === "page") {
    if (itemKey === "metadata_prototype" && !import.meta.env.DEV) {
      return (
        <div className="card state-info">
          <h3>Metadata Prototype</h3>
          <p>This debug view is only available in development mode.</p>
        </div>
      );
    }

    if (itemKey === "metadata_prototype") {
      return (
        <MetadataPrototype
          tenantId={tenantId}
          permissions={permissions}
        />
      );
    }

    if (itemKey === "company_profile") {
      return <CompanyProfileView canUpdate={permissions.can("update_company")} />;
    }

    if (itemKey === "users_and_roles") {
      return (
        <UsersRolesView
          canViewUsers={permissions.can("view_users")}
          canViewRoles={permissions.can("view_roles")}
          canAssignRole={permissions.can("assign_role")}
          canInviteUser={permissions.can("invite_user")}
          canDeactivateUser={permissions.can("deactivate_user")}
          canCreateRole={permissions.can("create_role")}
          canUpdateRole={permissions.can("update_role")}
          canDeleteRole={permissions.can("delete_role")}
        />
      );
    }

    return (
      <ModuleView
        tenantId={tenantId}
        module={selectedItem.label}
        can={can(permissions.can)}
      />
    );
  }

  if (itemType === "report") {
    return (
      <ModuleView
        tenantId={tenantId}
        module={selectedItem.label}
        can={can(permissions.can)}
      />
    );
  }

  return (
    <div className="card state-info">
      <h3>{selectedItem.label}</h3>
      <p>This item type ({itemType}) is not yet implemented.</p>
    </div>
  );
}
