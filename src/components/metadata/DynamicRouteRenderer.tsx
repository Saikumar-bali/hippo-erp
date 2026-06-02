import { useMemo, useState } from "react";
import type { WorkspaceItemMeta } from "../../lib/metadata/workspace-types";
import type { PermissionChecker } from "../../lib/permission-access";
import { useDocTypeConfig } from "../../lib/metadata/doctype-registry";
import { DynamicListPage } from "./DynamicListPage";
import { CompanyProfileView } from "../CompanyProfileView";
import { UsersRolesView } from "../UsersRolesView";
import { MetadataPrototype } from "../MetadataPrototype";
import { ModuleView } from "../ModuleView";
import { MetadataStudioHome } from "../metadata-studio/MetadataStudioHome";
import { CustomDocTypeWizard } from "../metadata-studio/CustomDocTypeWizard";
import { DocTypeBuilder } from "../metadata-studio/DocTypeBuilder";
import { DocTypeList } from "../metadata-studio/DocTypeList";
import { DocTypeCompletionChecklist } from "../metadata-studio/DocTypeCompletionChecklist";
import { DocFieldBuilder } from "../metadata-studio/DocFieldBuilder";
import { ListViewBuilder } from "../metadata-studio/ListViewBuilder";
import { FormLayoutBuilder } from "../metadata-studio/FormLayoutBuilder";
import { WorkspaceMenuBuilder } from "../metadata-studio/WorkspaceMenuBuilder";
import { AccessBuilder } from "../metadata-studio/AccessBuilder";
import { GrnListPage } from "../grn/GrnListPage";
import { CurrentInventoryPage } from "../grn/CurrentInventoryPage";
import { InventoryMovementsPage } from "../grn/InventoryMovementsPage";

import { DocFieldList } from "../metadata-studio/DocFieldList";
import { WorkspaceMetadataList, WorkspaceItemList } from "../metadata-studio/WorkspaceMetadataList";
import { ListViewMetadataList, DocTypeActionList } from "../metadata-studio/ListViewMetadataList";
import { FormLayoutMetadataList, NamingSeriesList, WorkflowList } from "../metadata-studio/FormLayoutMetadataList";

type Props = {
  selectedItem: WorkspaceItemMeta | null;
  tenantId: string;
  permissions: PermissionChecker;
  onRefreshSidebar?: () => Promise<void>;
  onNavigateToDocType?: (doctypeKey: string) => void;
};

const can = (fn: (key: string) => boolean) => (required: string | readonly string[]) => {
  if (typeof required === "string") return fn(required);
  return required.some((k) => fn(k));
};

function DocTypeListPage({
  doctypeKey,
  tenantId,
  permissions,
}: {
  doctypeKey: string;
  tenantId: string;
  permissions: PermissionChecker;
}) {
  const { config } = useDocTypeConfig(doctypeKey);

  const canUpdate = useMemo(() => {
    if (!config?.actions?.length) return false;
    return config.actions.some(
      (a) =>
        (a.action_key === "update" || a.action_key === "edit") &&
        permissions.can(a.permission_key),
    );
  }, [config, permissions]);

  const canDelete = useMemo(() => {
    if (!config?.actions?.length) return false;
    return config.actions.some(
      (a) =>
        (a.action_key === "deactivate" ||
          a.action_key === "delete" ||
          a.action_key === "remove") &&
        permissions.can(a.permission_key),
    );
  }, [config, permissions]);

  return (
    <DynamicListPage
      doctypeKey={doctypeKey}
      tenantId={tenantId}
      canUpdate={canUpdate}
      canDelete={canDelete}
      permissionChecker={(key: string) => permissions.can(key)}
    />
  );
}

function MetadataStudioRouter({ itemKey, onRefreshSidebar, onNavigateToDocType }: {
  itemKey: string;
  onRefreshSidebar?: () => Promise<void>;
  onNavigateToDocType?: (doctypeKey: string) => void;
}) {
  const [subPage, setSubPage] = useState<string | null>(itemKey === "metadata_studio" ? null : itemKey);

  if (!subPage || subPage === "metadata_studio") {
    return <MetadataStudioHome onNavigate={(k) => setSubPage(k)} />;
  }

  switch (subPage) {
    case "metadata_studio_wizard":
      return (
        <CustomDocTypeWizard
          onClose={() => setSubPage("metadata_studio")}
          onSidebarRefresh={onRefreshSidebar}
          onDocTypeCreated={onNavigateToDocType}
        />
      );
    case "metadata_studio_doctype_builder":
      return <DocTypeBuilder onDocTypeSaved={onNavigateToDocType} />;
    case "metadata_studio_field_builder":
      return <DocFieldBuilder />;
    case "metadata_studio_list_view_builder":
      return <ListViewBuilder />;
    case "metadata_studio_form_layout_builder":
      return <FormLayoutBuilder />;
    case "metadata_studio_workspace_menu_builder":
      return <WorkspaceMenuBuilder />;
    case "metadata_studio_access_builder":
      return <AccessBuilder />;
    case "metadata_studio_doctypes":
      return <DocTypeList />;
    case "metadata_studio_docfields":
      return <DocFieldList />;
    case "metadata_studio_workspaces":
      return <WorkspaceMetadataList />;
    case "metadata_studio_workspace_items":
      return <WorkspaceItemList />;
    case "metadata_studio_list_views":
      return <ListViewMetadataList />;
    case "metadata_studio_form_layouts":
      return <FormLayoutMetadataList />;
    case "metadata_studio_actions":
      return <DocTypeActionList />;
    case "metadata_studio_naming_series":
      return <NamingSeriesList />;
    case "metadata_studio_workflows":
      return <WorkflowList />;
    case "metadata_studio_doc_check":
      return <DocTypeCompletionChecklist />;
    default:
      return <DocTypeList />;
  }
}

export function DynamicRouteRenderer({ selectedItem, tenantId, permissions, onRefreshSidebar, onNavigateToDocType }: Props) {
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
      <DocTypeListPage
        doctypeKey={target}
        tenantId={tenantId}
        permissions={permissions}
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

    if (itemKey === "grn") {
      return <GrnListPage tenantId={tenantId} />;
    }

    if (itemKey === "current_inventory") {
      return <CurrentInventoryPage tenantId={tenantId} />;
    }

    if (itemKey === "movements") {
      return <InventoryMovementsPage tenantId={tenantId} />;
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

    if (itemKey.startsWith("metadata_studio")) {
      return (
        <MetadataStudioRouter
          key={itemKey}
          itemKey={itemKey}
          onRefreshSidebar={onRefreshSidebar}
          onNavigateToDocType={onNavigateToDocType}
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
