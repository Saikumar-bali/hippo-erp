import { useAuth } from "../context/AuthContext";

export function TenantSelector() {
  const { tenants, tenantLoadError, selectedTenantId, setSelectedTenantId } = useAuth();

  if (tenants.length === 0) {
    return (
      <div className="tenant-selector tenant-selector--empty" title={tenantLoadError || undefined}>
        No company selected
      </div>
    );
  }

  const selected = tenants.find((tenant) => tenant.id === selectedTenantId) ?? tenants[0];

  return (
    <div className="tenant-selector" title={tenantLoadError || undefined}>
      <select value={selected.id} onChange={(event) => setSelectedTenantId(event.target.value)}>
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
      <span>{selected.slug}</span>
    </div>
  );
}
