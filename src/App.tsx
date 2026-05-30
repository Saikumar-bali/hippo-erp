import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useAuth } from "./context/AuthContext";
import { usePermissions } from "./hooks/usePermissions";
import { useWorkspaceNavigation } from "./hooks/useWorkspaceNavigation";
import { AppShell } from "./components/layout/AppShell";
import { WorkspaceSidebar } from "./components/layout/WorkspaceSidebar";
import { TopBar } from "./components/layout/TopBar";
import { DynamicRouteRenderer } from "./components/metadata/DynamicRouteRenderer";
import type { WorkspaceItemMeta } from "./lib/metadata/workspace-types";

export default function App() {
  const [selectedItem, setSelectedItem] = useState<WorkspaceItemMeta | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const { session, signOut, tenantLoadError, tenants } = useAuth();
  const navigate = useNavigate();
  const [membershipToastShown, setMembershipToastShown] = useState(false);
  const permissions = usePermissions();
  const { tree, loading: navLoading, refresh: refreshSidebar } = useWorkspaceNavigation();

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
  };

  const handleHomeClick = () => {
    setSelectedItem(null);
  };

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

  return (
    <>
      <Toaster richColors position="top-right" expand={false} />
      <AppShell
        sidebar={
          <WorkspaceSidebar
            tree={tree}
            activeItemKey={selectedItem?.item_key ?? null}
            onItemClick={handleItemClick}
            onHomeClick={handleHomeClick}
          />
        }
        topbar={
          <TopBar
            userEmail={session?.user.email}
            signingOut={signingOut}
            onLogout={() => void doLogout()}
          />
        }
        content={
          <DynamicRouteRenderer
            selectedItem={selectedItem}
            tenantId={tenantId}
            permissions={permissions}
            onRefreshSidebar={refreshSidebar}
            onNavigateToDocType={handleNavigateToDocType}
          />
        }
      />
    </>
  );
}
