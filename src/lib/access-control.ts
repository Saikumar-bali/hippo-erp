export const STANDARD_ACCESS_RIGHTS = [
  "read",
  "create",
  "update",
  "delete",
  "submit",
  "cancel",
  "print",
  "export",
  "import",
  "report",
] as const;

export type AccessRightKey = (typeof STANDARD_ACCESS_RIGHTS)[number];
export type AccessTargetType = "doctype" | "page" | "report" | "menu";

export type AccessControlTarget = {
  target_type: AccessTargetType;
  target_key: string;
  label: string;
  module_key: string;
  module_label: string;
  workspace_key: string | null;
  item_key: string | null;
  item_type: string | null;
  required_permission_key: string | null;
  sort_order: number;
};

export type AccessControlMatrixRow = {
  target_type: AccessTargetType;
  target_key: string;
  label: string;
  module_key: string;
  module_label: string;
  workspace_key: string | null;
  right_key: AccessRightKey;
  permission_key: string;
  is_granted: boolean;
  is_configured: boolean;
  source_item_type: string | null;
  required_permission_key: string | null;
  sort_order: number;
};

export type AccessMatrixTarget = {
  key: string;
  targetType: AccessTargetType;
  targetKey: string;
  label: string;
  moduleKey: string;
  moduleLabel: string;
  workspaceKey: string | null;
  sourceItemType: string | null;
  sortOrder: number;
  rights: Record<AccessRightKey, AccessControlMatrixRow | null>;
};

export type UserRoleAssignmentRecord = {
  role_id: string;
  role_key: string;
  role_name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
};

export type DocTypeFieldAccessRecord = {
  fieldname: string;
  label: string;
  permlevel: number;
  can_read: boolean;
  can_write: boolean;
};

export type RoleDocTypePermlevelRow = {
  permlevel: number;
  field_count: number;
  field_labels: string[];
  role_can_read: boolean;
  role_can_write: boolean;
  effective_user_can_read: boolean;
  effective_user_can_write: boolean;
};

export type CompanyUserPermissionRule = {
  id: string;
  doctype_key: string;
  doctype_label: string;
  fieldname: string;
  field_label: string;
  permlevel: number;
  allowed_value: string;
  apply_read: boolean;
  apply_write: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanyUserPermissionPayload = {
  id?: string | null;
  user_id: string;
  doctype_key: string;
  fieldname: string;
  allowed_value: string;
  apply_read: boolean;
  apply_write: boolean;
  is_active: boolean;
};

export function accessTargetIdentity(targetType: AccessTargetType, targetKey: string, workspaceKey?: string | null) {
  return `${targetType}:${workspaceKey ?? ""}:${targetKey}`;
}

export function groupMatrixRows(rows: AccessControlMatrixRow[]): AccessMatrixTarget[] {
  const map = new Map<string, AccessMatrixTarget>();

  for (const row of rows) {
    const key = accessTargetIdentity(row.target_type, row.target_key, row.workspace_key);
    if (!map.has(key)) {
      map.set(key, {
        key,
        targetType: row.target_type,
        targetKey: row.target_key,
        label: row.label,
        moduleKey: row.module_key,
        moduleLabel: row.module_label,
        workspaceKey: row.workspace_key,
        sourceItemType: row.source_item_type,
        sortOrder: row.sort_order,
        rights: {
          read: null,
          create: null,
          update: null,
          delete: null,
          submit: null,
          cancel: null,
          print: null,
          export: null,
          import: null,
          report: null,
        },
      });
    }
    map.get(key)!.rights[row.right_key] = row;
  }

  return [...map.values()].sort((a, b) =>
    a.moduleLabel.localeCompare(b.moduleLabel) ||
    a.sortOrder - b.sortOrder ||
    a.label.localeCompare(b.label),
  );
}

export function formatPermissionLabel(permissionKey: string) {
  return permissionKey.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export function inferPermissionKeyFromError(rawMessage: string, fallbackPermissionKey: string) {
  const explicitMatch = rawMessage.match(/permission\s*:\s*([a-z0-9_]+)/i);
  if (explicitMatch?.[1]) return explicitMatch[1];

  const accessMatch = rawMessage.match(/access required[:\s]+([a-z0-9_]+)/i);
  if (accessMatch?.[1]) return accessMatch[1];

  return fallbackPermissionKey;
}

export function buildAccessErrorMessage(permissionKey: string) {
  return `Access required: ${permissionKey}. Fix: Open Access Control Manager and grant this right to one of the user's active roles.`;
}

export function buildMissingRightsDiagnostics(target: AccessMatrixTarget | null, effectivePermissionKeys: readonly string[]) {
  if (!target) return [];
  const permissionSet = new Set(effectivePermissionKeys);
  return STANDARD_ACCESS_RIGHTS.flatMap((rightKey) => {
    const row = target.rights[rightKey];
    if (!row || !row.permission_key) return [];
    if (permissionSet.has(row.permission_key)) return [];
    return [{
      rightKey,
      permissionKey: row.permission_key,
      configured: row.is_configured,
    }];
  });
}
