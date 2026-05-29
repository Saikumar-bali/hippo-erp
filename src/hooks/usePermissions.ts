import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getCompanyUsers, type CompanyUserRecord } from "../lib/users-api";
import type { PermissionChecker } from "../lib/permission-access";

type PermissionsState = PermissionChecker & {
  currentUser: CompanyUserRecord | null;
  permissionKeys: string[];
  membershipRole: string;
  companyRoleName: string;
};

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log("[permissions]", ...args);
};

export function usePermissions(): PermissionsState {
  const { session, selectedTenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<CompanyUserRecord | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [membershipRole, setMembershipRole] = useState("");
  const [companyRoleName, setCompanyRoleName] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!session?.user?.id || !selectedTenantId) {
        setCurrentUser(null);
        setPermissionKeys([]);
        setMembershipRole("");
        setCompanyRoleName("");
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const rows = await getCompanyUsers(selectedTenantId);
        if (cancelled) return;
        const user = rows.find((row) => row.user_id === session.user.id) ?? null;
        setCurrentUser(user);
        setPermissionKeys(user?.effective_permission_keys ?? []);
        setMembershipRole(user?.membership_role ?? "");
        setCompanyRoleName(user?.assigned_role_name ?? "");
        if (!user) {
          setError("No company membership found for the active user.");
        }
        devLog("loaded", {
          selectedTenantId,
          userId: session.user.id,
          hasUser: Boolean(user),
          permissionCount: user?.effective_permission_count ?? 0
        });
      } catch (err: any) {
        if (cancelled) return;
        setCurrentUser(null);
        setPermissionKeys([]);
        setMembershipRole("");
        setCompanyRoleName("");
        setError(err?.message ?? "Failed to load permissions.");
        devLog("error", err?.message ?? err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedTenantId, session?.user?.id]);

  const permissionSet = useMemo(() => new Set(permissionKeys), [permissionKeys]);
  const isCompanyAdmin = membershipRole === "admin" || membershipRole === "owner";

  const can = (required: string | readonly string[]) => {
    if (isCompanyAdmin) return true;
    const requiredList = Array.isArray(required) ? required : [required];
    return requiredList.every((permission) => permissionSet.has(permission));
  };

  const canAny = (required: readonly string[]) => {
    if (isCompanyAdmin) return true;
    return required.some((permission) => permissionSet.has(permission));
  };

  const canAll = (required: readonly string[]) => {
    if (isCompanyAdmin) return true;
    return required.every((permission) => permissionSet.has(permission));
  };

  return {
    currentUser,
    permissionKeys,
    membershipRole,
    companyRoleName,
    loading,
    error,
    isCompanyAdmin,
    can,
    canAny,
    canAll
  };
}
