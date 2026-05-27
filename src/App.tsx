import { useMemo, useState } from "react";
import { Boxes, Building2, LayoutDashboard, LogOut, PackageSearch } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { TenantSelector } from "./components/TenantSelector";
import { ModuleView } from "./components/ModuleView";

const modules = ["Dashboard KPIs","Products","Product categories","Units of measure","Warehouse hierarchy builder","Bin management","Current stock","Inventory batches and expiry","Inventory movements ledger","GRN","Stock transfers","Stock adjustments","Cycle counts","Reservations","Reorder alerts","Inventory valuation","Users and roles"] as const;

export default function App() {
  const [selected, setSelected] = useState<(typeof modules)[number]>("Dashboard KPIs");
  const { session, signOut } = useAuth();
  const titleIcon = useMemo(() => {
    if (selected.includes("Warehouse")) return <Building2 size={18} />;
    if (selected.includes("Product") || selected.includes("stock")) return <PackageSearch size={18} />;
    return <LayoutDashboard size={18} />;
  }, [selected]);

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><Boxes size={20} /> Hippo ERP</div>{modules.map((item)=><button key={item} className={`nav-item ${selected===item?"active":""}`} onClick={()=>setSelected(item)}>{item}</button>)}</aside><main className="main"><header className="topbar"><TenantSelector /><div className="user">{session?.user.email}</div><button className="logout" onClick={()=>void signOut()}><LogOut size={14} /> Logout</button></header><section className="content"><h1>{titleIcon} {selected}</h1><p>ERP module workspace connected to Supabase data layer.</p><ModuleView tenantId={localStorage.getItem("tenant_id") ?? ""} module={selected} /></section></main></div>;
}
