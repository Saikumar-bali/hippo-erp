import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AccessDenied } from "./AccessDenied";
import { createCategory, createGrn, createProduct, createUom, createWarehouse, listBatches, listMovements, listProducts, listStock, listValuation } from "../lib/inventory-api";
import { ERP_MODULES } from "../lib/erp-modules";
import { getModulePermissionSpec } from "../lib/permission-access";

type Props = { tenantId: string; module: string; can?: (required: string | readonly string[]) => boolean };

const columnMap: Record<string, string[]> = {
  "Products": ["sku", "name", "is_active"],
  "Current stock": ["product_id", "quantity", "reserved_quantity", "average_cost"],
  "Inventory batches and expiry": ["product_id", "batch_no", "expiry_date"],
  "Inventory movements ledger": ["movement_no", "movement_type", "quantity", "total_cost", "movement_date"],
  "Inventory valuation": ["product_id", "quantity", "average_cost", "total_value", "valuation_date"]
};

export function ModuleView({ tenantId, module, can }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const columns = useMemo(() => columnMap[module] ?? [], [module]);
  const moduleEntry = useMemo(() => ERP_MODULES.find((item) => item.label === module) ?? null, [module]);
  const permissionSpec = useMemo(() => getModulePermissionSpec(module), [module]);
  const canViewModule = can ? can(permissionSpec.requiredPermissions) : true;
  const canCreateRecords = can ? !permissionSpec.createPermissions || can(permissionSpec.createPermissions) : true;

  useEffect(() => {
    if (moduleEntry?.status === "pending") {
      setRows([]);
      setMessage("");
      setError("");
      setLoading(false);
      return;
    }
    const run = async () => {
      setMessage("");
      setError("");
      setLoading(true);
      try {
        if (!tenantId) {
          setRows([]);
          return;
        }
        if (module === "Products") setRows(await listProducts(tenantId));
        else if (module === "Current stock") setRows(await listStock(tenantId));
        else if (module === "Inventory batches and expiry") setRows(await listBatches(tenantId));
        else if (module === "Inventory movements ledger") setRows(await listMovements(tenantId));
        else if (module === "Inventory valuation") setRows(await listValuation(tenantId));
        else setRows([]);
      } catch (err: any) {
        const message = err?.message ?? "Failed to load module data.";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [tenantId, module, moduleEntry?.status]);

  const simpleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMessage("");
    setError("");
    try {
      if (module === "Product categories") {
        await createCategory({ tenant_id: tenantId, code: String(fd.get("code")), name: String(fd.get("name")) });
      } else if (module === "Units of measure") {
        await createUom({ tenant_id: tenantId, code: String(fd.get("code")), name: String(fd.get("name")) });
      } else if (module === "Warehouse hierarchy builder") {
        await createWarehouse({ tenant_id: tenantId, warehouse_code: String(fd.get("code")), name: String(fd.get("name")) });
      } else if (module === "Products") {
        await createProduct({
          tenant_id: tenantId,
          category_id: String(fd.get("category_id")),
          uom_id: String(fd.get("uom_id")),
          sku: String(fd.get("sku")),
          name: String(fd.get("name")),
          reorder_point: Number(fd.get("reorder_point"))
        });
      } else if (module === "GRN") {
        await createGrn({
          tenant_id: tenantId,
          warehouse_id: String(fd.get("warehouse_id")),
          supplier_name: String(fd.get("supplier_name")),
          lines: [{ product_id: String(fd.get("product_id")), qty: Number(fd.get("qty")), unit_cost: Number(fd.get("unit_cost")) }]
        });
      }
      setMessage("Saved successfully.");
      toast.success("Saved successfully.");
      e.currentTarget.reset();
    } catch (err: any) {
      const message = err?.message ?? "Save failed.";
      setError(message);
      toast.error(message);
    }
  };

  const showForm = ["Product categories", "Units of measure", "Warehouse hierarchy builder", "Products", "GRN"].includes(module);

  if (!canViewModule) {
    return (
      <AccessDenied
        title={module}
        requiredPermissions={permissionSpec.requiredPermissions}
        message="Your current company role cannot access this module."
      />
    );
  }

  if (moduleEntry?.status === "pending") {
    return (
      <div className="card state-info">
        <strong>{module}</strong>
        <p style={{ margin: "8px 0 0" }}>
          This module is part of the Frappe-style ERP foundation and is planned for a later phase.
          The menu entry is documented now, but the backend and screen flow are not wired yet.
        </p>
      </div>
    );
  }

  return (
    <div className="module-stack">
      {showForm && canCreateRecords && (
        <form onSubmit={simpleCreate} className="card form-grid">
          {module !== "Products" && module !== "GRN" && <><input name="code" placeholder="Code" required /><input name="name" placeholder="Name" required /></>}
          {module === "Products" && <><input name="category_id" placeholder="Category ID" required /><input name="uom_id" placeholder="UOM ID" required /><input name="sku" placeholder="SKU" required /><input name="name" placeholder="Name" required /><input name="reorder_point" type="number" placeholder="Reorder point" required /></>}
          {module === "GRN" && <><input name="warehouse_id" placeholder="Warehouse ID" required /><input name="supplier_name" placeholder="Supplier" required /><input name="product_id" placeholder="Product ID" required /><input name="qty" type="number" placeholder="Qty" required /><input name="unit_cost" type="number" placeholder="Unit cost" required /></>}
          <button className="primary-action" type="submit">Save</button>
        </form>
      )}

      {showForm && !canCreateRecords && (
        <div className="card state-info">You can view this module, but your current company role cannot create new records here.</div>
      )}

      {loading && <div className="card state-info">Loading {module.toLowerCase()}...</div>}
      {!!error && <div className="card state-error">{error}</div>}
      {!!message && <div className="card state-success">{message}</div>}

      {!loading && !error && columns.length > 0 && rows.length === 0 && (
        <div className="card state-info">No records yet for this module.</div>
      )}

      {columns.length > 0 && rows.length > 0 && (
        <div className="card table-wrap">
          <strong>{module} Data</strong>
          <table className="erp-table">
            <thead>
              <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>{columns.map((c) => <td key={c}>{String(r?.[c] ?? "-")}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
