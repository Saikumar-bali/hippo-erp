import type { ReactNode } from "react";
import { AccessDenied } from "./AccessDenied";

type Props = {
  allowed: boolean;
  loading: boolean;
  title: string;
  requiredPermissions: readonly string[];
  children: ReactNode;
};

export function PermissionGate({ allowed, loading, title, requiredPermissions, children }: Props) {
  if (loading) {
    return <div className="card state-info">Checking permissions...</div>;
  }

  if (!allowed) {
    return <AccessDenied title={title} requiredPermissions={requiredPermissions} />;
  }

  return <>{children}</>;
}
