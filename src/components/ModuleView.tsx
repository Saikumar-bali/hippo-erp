import { FormEvent, useEffect, useState } from "react";
import { createCategory, createGrn, createProduct, createUom, createWarehouse, listBatches, listMovements, listProducts, listStock, listValuation } from "../lib/inventory-api";

type Props = { tenantId: string; module: string };

export function ModuleView({ tenantId, module }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const run = async () => {
      setMsg("");
      if (!tenantId) return;
      if (module === "Products") setRows(await listProducts(tenantId));
      else if (module === "Current stock") setRows(await listStock(tenantId));
      else if (module === "Inventory batches and expiry") setRows(await listBatches(tenantId));
      else if (module === "Inventory movements ledger") setRows(await listMovements(tenantId));
      else if (module === "Inventory valuation") setRows(await listValuation(tenantId));
      else setRows([]);
    };
    void run();
  }, [tenantId, module]);

  const simpleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
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
      setMsg("Saved successfully.");
      e.currentTarget.reset();
    } catch (err: any) {
      setMsg(err.message ?? "Failed");
    }
  };

  const showForm = ["Product categories", "Units of measure", "Warehouse hierarchy builder", "Products", "GRN"].includes(module);

  return (
    <div>
      {showForm && (
        <form onSubmit={simpleCreate} className="card form-grid">
          {module !== "Products" && module !== "GRN" && <><input name="code" placeholder="Code" required /><input name="name" placeholder="Name" required /></>}
          {module === "Products" && <><input name="category_id" placeholder="Category ID" required /><input name="uom_id" placeholder="UOM ID" required /><input name="sku" placeholder="SKU" required /><input name="name" placeholder="Name" required /><input name="reorder_point" type="number" placeholder="Reorder point" required /></>}
          {module === "GRN" && <><input name="warehouse_id" placeholder="Warehouse ID" required /><input name="supplier_name" placeholder="Supplier" required /><input name="product_id" placeholder="Product ID" required /><input name="qty" type="number" placeholder="Qty" required /><input name="unit_cost" type="number" placeholder="Unit cost" required /></>}
          <button type="submit">Save</button>
        </form>
      )}
      {msg && <p>{msg}</p>}
      <div className="card">
        <strong>{module} Data</strong>
        <pre>{JSON.stringify(rows, null, 2)}</pre>
      </div>
    </div>
  );
}
