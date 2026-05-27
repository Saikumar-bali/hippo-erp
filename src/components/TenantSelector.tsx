import { useAuth } from "../context/AuthContext";

export function TenantSelector() {
  const { tenants, selectedTenantId, setSelectedTenantId } = useAuth();
  if (tenants.length === 0) return <div>No tenant membership yet.</div>;
  return (
    <select value={selectedTenantId ?? ""} onChange={(e) => setSelectedTenantId(e.target.value)}>
      {tenants.map((t) => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );
}
