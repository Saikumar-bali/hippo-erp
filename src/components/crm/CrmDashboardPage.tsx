import { useEffect, useState } from "react";
import { 
  UsersRound, 
  BadgeDollarSign, 
  ListTodo, 
  Trophy, 
  PlusCircle, 
  ChevronRight,
  UserPlus,
  Target
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Props = {
  tenantId: string;
  onNavigateToDocType?: (doctypeKey: string) => void;
};

type CrmMetrics = {
  leadsCount: number;
  opportunitiesCount: number;
  openTasksCount: number;
  wonOpportunitiesCount: number;
};

export function CrmDashboardPage({ tenantId, onNavigateToDocType }: Props) {
  const [metrics, setMetrics] = useState<CrmMetrics>({
    leadsCount: 0,
    opportunitiesCount: 0,
    openTasksCount: 0,
    wonOpportunitiesCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      try {
        // Since we are using generic_json storage, we need to query erp_documents
        const { data, error } = await supabase.schema("app")
          .from("erp_documents")
          .select("doctype_key, data")
          .eq("tenant_id", tenantId)
          .in("doctype_key", ["crm_lead", "crm_opportunity", "crm_followup_task"]);

        if (error) throw error;

        const m: CrmMetrics = {
          leadsCount: 0,
          opportunitiesCount: 0,
          openTasksCount: 0,
          wonOpportunitiesCount: 0
        };

        (data || []).forEach(doc => {
          const docData = doc.data as Record<string, any>;
          if (doc.doctype_key === "crm_lead") m.leadsCount++;
          if (doc.doctype_key === "crm_opportunity") {
            m.opportunitiesCount++;
            if (docData.stage === "Won") m.wonOpportunitiesCount++;
          }
          if (doc.doctype_key === "crm_followup_task") {
            if (docData.status === "Open") m.openTasksCount++;
          }
        });

        setMetrics(m);
      } catch (err) {
        console.error("Failed to load CRM metrics:", err);
      } finally {
        setLoading(false);
      }
    }

    if (tenantId) {
      void loadMetrics();
    }
  }, [tenantId]);

  const cards = [
    { label: "Leads", count: metrics.leadsCount, icon: UsersRound, color: "#2563eb", key: "crm_lead" },
    { label: "Opportunities", count: metrics.opportunitiesCount, icon: Target, color: "#7c3aed", key: "crm_opportunity" },
    { label: "Won Deals", count: metrics.wonOpportunitiesCount, icon: Trophy, color: "#16a34a", key: "crm_opportunity" },
    { label: "Open Tasks", count: metrics.openTasksCount, icon: ListTodo, color: "#ea580c", key: "crm_followup_task" }
  ];

  return (
    <div className="module-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sales workspace</p>
          <h1>CRM Dashboard</h1>
          <p>Compact overview of your sales pipeline and follow-up work.</p>
        </div>
      </header>

      {loading ? (
        <div className="card state-info">Loading metrics...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-6)", marginBottom: "var(--space-8)" }}>
            {cards.map(card => (
              <div key={card.label} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
                <div style={{ padding: "var(--space-4)", borderRadius: "var(--radius-md)", backgroundColor: `${card.color}15`, color: card.color }}>
                  <card.icon size={28} />
                </div>
                <div>
                  <div style={{ fontSize: "var(--font-size-sm)", color: "#64748b", fontWeight: 500 }}>{card.label}</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a" }}>{card.count}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-6)" }}>
            <section className="card">
              <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, marginBottom: "var(--space-6)", display: "flex", alignItems: "center", gap: "8px" }}>
                <PlusCircle size={20} color="#64748b" /> Quick Actions
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <button 
                  className="primary-action" 
                  style={{ justifyContent: "space-between", width: "100%", padding: "0 var(--space-6)" }}
                  onClick={() => onNavigateToDocType?.("crm_lead")}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><UserPlus size={16} /> Open leads</span>
                  <ChevronRight size={16} opacity={0.5} />
                </button>
                <button 
                  className="primary-action" 
                  style={{ justifyContent: "space-between", width: "100%", padding: "0 var(--space-6)" }}
                  onClick={() => onNavigateToDocType?.("crm_opportunity")}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><BadgeDollarSign size={16} /> Open opportunities</span>
                  <ChevronRight size={16} opacity={0.5} />
                </button>
              </div>
            </section>

            <section className="card">
              <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, marginBottom: "var(--space-6)", display: "flex", alignItems: "center", gap: "8px" }}>
                <ChevronRight size={20} color="#64748b" /> Browse
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <button 
                  className="logout" 
                  style={{ justifyContent: "space-between", width: "100%", padding: "0 var(--space-6)", border: "1px solid #e2e8f0" }}
                  onClick={() => onNavigateToDocType?.("crm_lead")}
                >
                  <span>Open Leads</span>
                  <ChevronRight size={16} opacity={0.5} />
                </button>
                <button 
                  className="logout" 
                  style={{ justifyContent: "space-between", width: "100%", padding: "0 var(--space-6)", border: "1px solid #e2e8f0" }}
                  onClick={() => onNavigateToDocType?.("crm_opportunity")}
                >
                  <span>Open Opportunities</span>
                  <ChevronRight size={16} opacity={0.5} />
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
