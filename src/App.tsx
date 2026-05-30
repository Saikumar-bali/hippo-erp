import { useEffect, useMemo, useState } from "react";
import { Boxes, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useAuth } from "./context/AuthContext";
import { TenantSelector } from "./components/TenantSelector";
import { ModuleView } from "./components/ModuleView";
import { MetadataPrototype } from "./components/MetadataPrototype";
import { CompanyProfileView } from "./components/CompanyProfileView";
import { UsersRolesView } from "./components/UsersRolesView";
import { DynamicListPage } from "./components/metadata/DynamicListPage";
import { PermissionGate } from "./components/PermissionGate";
import { usePermissions } from "./hooks/usePermissions";
import { ERP_MODULES } from "./lib/erp-modules";
import { getModulePermissionSpec, hasAnyPermission, type ModuleLabel } from "./lib/permission-access";

export default function App() {
  const [selected, setSelected] = useState<ModuleLabel>("Company profile");
  const [signingOut, setSigningOut] = useState(false);
  const { session, signOut, tenantLoadError, tenants } = useAuth();
  const navigate = useNavigate();
  const [membershipToastShown, setMembershipToastShown] = useState(false);
  const permissions = usePermissions();

  const selectedModuleSpec = getModulePermissionSpec(selected);
  const selectedModuleAllowed = permissions.canAny(selectedModuleSpec.requiredPermissions);
  const selectedModuleEntry = useMemo(
    () => ERP_MODULES.find((module) => module.label === selected) ?? null,
    [selected]
  );
  const SelectedIcon = selectedModuleEntry?.icon ?? Boxes;

  const doLogout = async () => {
    setSigningOut(true);
    if (import.meta.env.DEV) console.log("[app] logout:click");
    try {
      await signOut();
      if (import.meta.env.DEV) console.log("[app] logout:redirect:/login");
      navigate("/login", { replace: true });
    } catch (err: any) {
      if (import.meta.env.DEV) console.error("[app] logout:error", err?.message ?? err);
      toast.error(err?.message ?? "Logout failed. Redirecting to login anyway.");
      navigate("/login", { replace: true });
    } finally {
      if (import.meta.env.DEV) console.log("[app] logout:finally");
      setSigningOut(false);
    }
  };

  const hasMembershipError = tenantLoadError && tenants.length === 0;

  useEffect(() => {
    if (hasMembershipError && !membershipToastShown) {
      toast.error(`Company membership load failed: ${tenantLoadError}`);
      setMembershipToastShown(true);
    }
    if (!hasMembershipError && membershipToastShown) {
      setMembershipToastShown(false);
    }
  }, [hasMembershipError, membershipToastShown, tenantLoadError]);

  const visibleModules = ERP_MODULES.map((module) => ({
    ...module,
    allowed: hasAnyPermission(permissions.can, module.requiredPermissions),
    clickable: hasAnyPermission(permissions.can, module.requiredPermissions) && module.status === "active"
  }));
  const firstAccessibleModule = visibleModules.find((module) => module.clickable)?.label ?? null;

  useEffect(() => {
    if (!permissions.loading && firstAccessibleModule && !selectedModuleAllowed) {
      setSelected(firstAccessibleModule);
    }
  }, [firstAccessibleModule, permissions.loading, selectedModuleAllowed]);

  return (
    <>
      <Toaster richColors position="top-right" expand={false} />
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <Boxes size={18} /> Hippo ERP
          </div>
          {visibleModules.map((item) => {
            const ItemIcon = item.icon;
            return (
            <button
              key={item.label}
              className={`nav-item ${selected === item.label ? "active" : ""} nav-item--${item.status}`}
              onClick={() => item.clickable && setSelected(item.label)}
              disabled={!item.clickable}
              title={
                !item.allowed
                  ? `Requires: ${item.requiredPermissions.join(", ")}`
                  : item.status === "pending"
                    ? `${item.label} is planned for a future phase`
                    : `${item.label} · ${item.route}`
              }
            >
              <span className="nav-item-icon">
                <ItemIcon size={14} />
              </span>
              <span className="nav-item-text">
                <span className="nav-item-label">{item.label}</span>
                <span className="nav-item-meta">
                  <span>{item.scope}</span>
                  <span className={`nav-item-status nav-item-status--${item.status}`}>{item.status}</span>
                </span>
              </span>
            </button>
            );
          })}
        </aside>
        <main className="main">
          <header className="topbar">
            <TenantSelector />
            <div className="user">{session?.user.email}</div>
            <button className="logout" onClick={() => void doLogout()} disabled={signingOut}>
              <LogOut size={14} /> {signingOut ? "Logging out..." : "Logout"}
            </button>
          </header>
          <section className="content">
            <h1>
              <SelectedIcon size={16} /> {selected}
            </h1>
            <p>ERP module workspace connected to Supabase data layer.</p>
            <PermissionGate
              allowed={selectedModuleAllowed}
              loading={permissions.loading}
              title={selected}
              requiredPermissions={selectedModuleSpec.requiredPermissions}
            >
              {selected === "Company profile" ? (
                <CompanyProfileView canUpdate={permissions.can("update_company")} />
              ) : selected === "Users and roles" ? (
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
              ) : selected === "Products" ? (
                <DynamicListPage
                  doctypeKey="product"
                  tenantId={localStorage.getItem("tenant_id") ?? ""}
                  canUpdate={permissions.can("update_product")}
                  canDelete={permissions.can("delete_product")}
                  permissionChecker={(key: string) => permissions.can(key)}
                />
              ) : selected === "Product categories" ? (
                <DynamicListPage
                  doctypeKey="product_category"
                  tenantId={localStorage.getItem("tenant_id") ?? ""}
                  canUpdate={permissions.can("update_product")}
                  canDelete={permissions.can("delete_product")}
                  permissionChecker={(key: string) => permissions.can(key)}
                />
              ) : selected === "Units of measure" ? (
                <DynamicListPage
                  doctypeKey="unit_of_measure"
                  tenantId={localStorage.getItem("tenant_id") ?? ""}
                  canUpdate={permissions.can("update_product")}
                  canDelete={permissions.can("delete_product")}
                  permissionChecker={(key: string) => permissions.can(key)}
                />
              ) : selected === "Metadata Prototype" ? (
                <MetadataPrototype
                  tenantId={localStorage.getItem("tenant_id") ?? ""}
                  permissions={permissions}
                />
              ) : (
                <ModuleView tenantId={localStorage.getItem("tenant_id") ?? ""} module={selected} can={permissions.can} />
              )}
            </PermissionGate>
          </section>
        </main>
      </div>
    </>
  );
}
