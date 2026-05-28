import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getMyTenants } from "../lib/inventory-api";

type Tenant = { id: string; name: string; slug: string };

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  tenants: Tenant[];
  selectedTenantId: string | null;
  setSelectedTenantId: (id: string) => void;
  refreshTenants: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantIdState] = useState<string | null>(localStorage.getItem("tenant_id"));

  const setSelectedTenantId = (id: string) => {
    localStorage.setItem("tenant_id", id);
    setSelectedTenantIdState(id);
  };

  const refreshTenants = async () => {
    const rows = await getMyTenants();
    setTenants(rows);
    if (rows.length > 0 && !selectedTenantId) {
      setSelectedTenantId(rows[0].id);
    }
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session);
        if (data.session) {
          await refreshTenants();
        }
      })
      .catch(() => {
        setSession(null);
        setTenants([]);
        localStorage.removeItem("tenant_id");
        setSelectedTenantIdState(null);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange(async (_, next) => {
      setSession(next);
      if (next) {
        await refreshTenants();
      } else {
        setTenants([]);
        localStorage.removeItem("tenant_id");
        setSelectedTenantIdState(null);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      tenants,
      selectedTenantId,
      setSelectedTenantId,
      refreshTenants,
      signOut: () => supabase.auth.signOut().then(() => undefined)
    }),
    [session, loading, tenants, selectedTenantId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
