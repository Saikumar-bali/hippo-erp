export type PermissionCatalogRecord = {
  permission_key: string;
  module_key: string;
  module_label: string;
  permission_label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type PermissionGroup = {
  module_key: string;
  module_label: string;
  permissions: PermissionCatalogRecord[];
};

const moduleOrder = [
  "company",
  "users",
  "roles",
  "products",
  "warehouse",
  "grn",
  "inventory",
  "reports",
  "dashboard",
  "documents"
];

export function groupPermissions(records: PermissionCatalogRecord[]): PermissionGroup[] {
  const map = new Map<string, PermissionGroup>();
  for (const record of records) {
    if (!map.has(record.module_key)) {
      map.set(record.module_key, {
        module_key: record.module_key,
        module_label: record.module_label,
        permissions: []
      });
    }
    map.get(record.module_key)!.permissions.push(record);
  }

  return [...map.values()]
    .sort((a, b) => {
      const ai = moduleOrder.indexOf(a.module_key);
      const bi = moduleOrder.indexOf(b.module_key);
      if (ai !== bi) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.module_label.localeCompare(b.module_label);
    })
    .map((group) => ({
      ...group,
      permissions: group.permissions.sort((a, b) => a.sort_order - b.sort_order || a.permission_key.localeCompare(b.permission_key))
    }));
}
