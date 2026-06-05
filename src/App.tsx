import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useAuth } from "./context/AuthContext";
import { usePermissions } from "./hooks/usePermissions";
import { useWorkspaceNavigation } from "./hooks/useWorkspaceNavigation";
import { AppShell } from "./components/layout/AppShell";
import { WorkspaceSidebar } from "./components/layout/WorkspaceSidebar";
import { TopBar } from "./components/layout/TopBar";
import { DynamicRouteRenderer } from "./components/metadata/DynamicRouteRenderer";
import type { WorkspaceItemMeta } from "./lib/metadata/workspace-types";
import type { BreadcrumbItem } from "./lib/navigation/breadcrumbs";
import { buildBreadcrumbs } from "./lib/navigation/breadcrumbs";
import { getCompanyTheme } from "./lib/theme-api";
import { DEFAULT_THEME_SETTINGS, type CompanyThemeSettings } from "./lib/theme-types";

export default function App() {
  const { pageKey } = useParams();
  const [selectedItem, setSelectedItem] = useState<WorkspaceItemMeta | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const { session, signOut, tenantLoadError, tenants } = useAuth();
  const navigate = useNavigate();
  const [membershipToastShown, setMembershipToastShown] = useState(false);
  const [companyTheme, setCompanyTheme] = useState<CompanyThemeSettings | null>(null);
  const permissions = usePermissions();
  const { tree, loading: navLoading, refresh: refreshSidebar } = useWorkspaceNavigation();

  const isSameItem = useCallback((nextItem: WorkspaceItemMeta | null) => {
    if (!selectedItem && !nextItem) return true;
    if (!selectedItem || !nextItem) return false;
    return selectedItem.item_key === nextItem.item_key
      && selectedItem.workspace_key === nextItem.workspace_key
      && selectedItem.target === nextItem.target;
  }, [selectedItem]);

  // Sync selectedItem with URL pageKey
  useEffect(() => {
    if (navLoading || permissions.loading) return;

    if (pageKey) {
      console.log("[app] deep link detected:", pageKey);
      // 1. Try to find a real item in the tree
      let found: WorkspaceItemMeta | undefined;
      for (const ws of tree) {
        found = ws.items.find((item) => item.item_key === pageKey || item.target === pageKey);
        if (found) break;
      }

      if (found) {
        console.log("[app] found matching item in tree:", found.item_key);
        if (!isSameItem(found)) {
          setSelectedItem(found);
        }
      } else if (pageKey.startsWith("metadata_studio") || pageKey === "crm_dashboard" || pageKey === "users_and_roles_access_assignments" || pageKey === "theme_studio" || pageKey.startsWith("print:")) {
        console.log("[app] creating virtual item for:", pageKey);
        
        let workspaceKey = "metadata_studio";
        let requiredPermission = "manage_metadata";
        
        if (pageKey === "crm_dashboard") {
          workspaceKey = "crm";
          requiredPermission = "view_crm_lead";
        } else if (pageKey === "users_and_roles_access_assignments" || pageKey === "theme_studio") {
          workspaceKey = "company_admin";
          requiredPermission = pageKey === "theme_studio" ? "update_company" : "view_users";
        } else if (pageKey.startsWith("print:")) {
          const parts = pageKey.split(":");
          workspaceKey = "crm"; // Default or detect from doctype
          requiredPermission = `print_${parts[1]}`;
        }

        // 2. Virtual item for metadata studio diagnostic sub-pages or CRM dashboard
        const virtualItem: WorkspaceItemMeta = {
          id: `virtual-${pageKey}`,
          workspace_key: workspaceKey,
          item_key: pageKey,
          label: pageKey === "crm_dashboard"
            ? "CRM Dashboard"
            : pageKey === "users_and_roles_access_assignments"
              ? "Users and Roles Access Assignments"
              : pageKey === "theme_studio"
                ? "Theme Studio"
                : pageKey.startsWith("print:") 
                  ? "Print Preview"
                  : pageKey.split(":")[0].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          item_type: "page",
          target: pageKey,
          icon: pageKey === "crm_dashboard" ? "LayoutDashboard" : pageKey === "users_and_roles_access_assignments" ? "ShieldCheck" : pageKey === "theme_studio" ? "Palette" : pageKey.startsWith("print:") ? "Printer" : "Activity",
          sort_order: 0,
          is_active: true,
          required_permission_key: requiredPermission,
        };
        if (!isSameItem(virtualItem)) {
          setSelectedItem(virtualItem);
        }
      } else {
        console.log("[app] pageKey did not match any item or virtual pattern:", pageKey);
      }
    }
  }, [pageKey, tree, navLoading, permissions.loading, isSameItem]);

  const doLogout = async () => {
    setSigningOut(true);
    if (import.meta.env.DEV) console.log("[app] logout:click");
    try {
      await signOut();
      if (import.meta.env.DEV) console.log("[app] logout:redirect:/login");
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Logout failed";
      if (import.meta.env.DEV) console.error("[app] logout:error", msg);
      toast.error(msg + ". Redirecting to login anyway.");
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

  const firstAccessibleItem = useMemo(() => {
    if (navLoading || permissions.loading) return null;
    for (const ws of tree) {
      for (const item of ws.items) {
        if (permissions.can(item.required_permission_key ?? "")) {
          return item;
        }
      }
    }
    return null;
  }, [tree, navLoading, permissions]);

  useEffect(() => {
    if (!selectedItem && firstAccessibleItem) {
      setSelectedItem(firstAccessibleItem);
    }
  }, [firstAccessibleItem, selectedItem]);

  const handleItemClick = (item: WorkspaceItemMeta) => {
    setSelectedItem(item);
    navigate(`/${item.item_key}`);
  };

  const handleHomeClick = () => {
    setSelectedItem(null);
    navigate("/");
  };

  const breadcrumbs = useMemo(() => buildBreadcrumbs(selectedItem, tree), [selectedItem, tree]);

  const handleBreadcrumbNavigate = useCallback((item: BreadcrumbItem) => {
    if (item.key === "home") {
      handleHomeClick();
      return;
    }
    if (item.key.startsWith("workspace:")) {
      const workspaceKey = item.key.replace("workspace:", "");
      const firstWorkspaceItem = tree.find((group) => group.workspace.workspace_key === workspaceKey)?.items[0] ?? null;
      if (firstWorkspaceItem) {
        handleItemClick(firstWorkspaceItem);
      }
    }
  }, [tree]);

  const handleNavigateToDocType = useCallback((doctypeKey: string) => {
    for (const ws of tree) {
      const found = ws.items.find((item) => item.item_key === doctypeKey);
      if (found) {
        setSelectedItem(found);
        return;
      }
    }
  }, [tree]);

  const tenantId = localStorage.getItem("tenant_id") ?? "";
  const effectiveTheme = companyTheme ?? { company_id: tenantId, ...DEFAULT_THEME_SETTINGS };

  useEffect(() => {
    let alive = true;
    if (!tenantId) {
      queueMicrotask(() => {
        if (alive) setCompanyTheme(null);
      });
      return () => {
        alive = false;
      };
    }
    getCompanyTheme(tenantId)
      .then((theme) => {
        if (alive) setCompanyTheme(theme);
      })
      .catch((error: Error) => {
        if (import.meta.env.DEV && !error.message.includes("is not a function")) {
          console.warn("[theme] load failed", error.message);
        }
        if (alive) setCompanyTheme(null);
      });

    return () => {
      alive = false;
    };
  }, [tenantId]);

  useEffect(() => {
    const theme = companyTheme ?? { company_id: tenantId, ...DEFAULT_THEME_SETTINGS };
    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.primary_color);
    root.style.setProperty("--color-accent", theme.accent_color);
    root.style.setProperty("--color-sidebar", theme.sidebar_color);
    root.style.setProperty("--color-topbar", theme.topbar_color);
    Object.entries(theme.custom_variables ?? {}).forEach(([key, value]) => {
      if (key.startsWith("--hippo-")) root.style.setProperty(key, value);
    });
    root.dataset.density = theme.density_mode;

    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (theme.favicon_url) {
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      favicon.href = theme.favicon_url;
    }
  }, [companyTheme, tenantId]);

  return (
    <>
      <Toaster richColors position="top-right" expand={false} />
      <AppShell
        sidebar={
          <WorkspaceSidebar
            tree={tree}
            companyName={effectiveTheme.company_name ?? "Hippo ERP"}
            logoUrl={effectiveTheme.logo_url}
            activeItemKey={selectedItem?.item_key ?? null}
            onItemClick={handleItemClick}
            onHomeClick={handleHomeClick}
          />
        }
        topbar={
          <TopBar
            userEmail={session?.user.email}
            companyName={effectiveTheme.company_name ?? "Hippo ERP"}
            logoUrl={effectiveTheme.logo_url}
            signingOut={signingOut}
            onLogout={() => void doLogout()}
          />
        }
        breadcrumbs={breadcrumbs}
        onBreadcrumbNavigate={handleBreadcrumbNavigate}
        densityMode={effectiveTheme.density_mode}
        content={
          <DynamicRouteRenderer
            selectedItem={selectedItem}
            tenantId={tenantId}
            permissions={permissions}
            onRefreshSidebar={refreshSidebar}
            onNavigateToDocType={handleNavigateToDocType}
            onThemeChanged={setCompanyTheme}
          />
        }
      />
    </>
  );
}
