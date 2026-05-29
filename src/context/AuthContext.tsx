import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getMyTenants } from "../lib/inventory-api";

type Tenant = { id: string; name: string; slug: string; role?: string };

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  tenants: Tenant[];
  tenantLoadError: string;
  selectedTenantId: string | null;
  setSelectedTenantId: (id: string) => void;
  refreshTenants: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log("[auth]", ...args);
};
const TENANT_CACHE_KEY = "hippo_company_cache";

function clearLocalAuthState(
  setSession: (value: Session | null) => void,
  setTenants: (value: Tenant[]) => void,
  setTenantLoadError: (value: string) => void,
  setSelectedTenantIdState: (value: string | null) => void
) {
  setSession(null);
  setTenants([]);
  setTenantLoadError("");
  localStorage.removeItem("tenant_id");
  localStorage.removeItem(TENANT_CACHE_KEY);
  setSelectedTenantIdState(null);
}

function readCachedTenants(): Tenant[] {
  try {
    const raw = localStorage.getItem(TENANT_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedTenants(tenants: Tenant[]) {
  try {
    localStorage.setItem(TENANT_CACHE_KEY, JSON.stringify(tenants));
  } catch {
    // ignore cache write failures
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>(readCachedTenants());
  const [tenantLoadError, setTenantLoadError] = useState("");
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const lastLoadedUserIdRef = useRef<string | null>(null);
  const refreshSeqRef = useRef(0);
  // Internal key retained for compatibility: `tenant_id` stores the selected company context.
  const [selectedTenantId, setSelectedTenantIdState] = useState<string | null>(localStorage.getItem("tenant_id"));

  const setSelectedTenantId = (id: string) => {
    localStorage.setItem("tenant_id", id);
    setSelectedTenantIdState(id);
  };

  const refreshTenants = async () => {
    if (refreshPromiseRef.current) {
      devLog("refreshTenants:joinInFlight");
      return refreshPromiseRef.current;
    }
    const requestId = ++refreshSeqRef.current;
    refreshPromiseRef.current = (async () => {
      devLog("refreshTenants:start", { selectedTenantId });
      const rows = await getMyTenants();
      devLog("refreshTenants:success", { count: rows.length, ids: rows.map((r) => r.id) });
      if (requestId !== refreshSeqRef.current) return;
      setTenantLoadError("");
      setTenants(rows);
      writeCachedTenants(rows);
      lastLoadedUserIdRef.current = session?.user?.id ?? lastLoadedUserIdRef.current;
      if (rows.length > 0 && !selectedTenantId) {
        setSelectedTenantId(rows[0].id);
      }
    })();
    try {
      await refreshPromiseRef.current;
    } catch (err) {
      if (requestId === refreshSeqRef.current) throw err;
    } finally {
      refreshPromiseRef.current = null;
    }
  };

  useEffect(() => {
    const loadingGuard = window.setTimeout(() => {
      setLoading(false);
    }, 8000);

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        devLog("getSession:resolved", { hasSession: Boolean(data.session), userId: data.session?.user?.id });
        setSession(data.session);
        if (data.session) {
          try {
            await refreshTenants();
          } catch (err: any) {
          const cached = readCachedTenants();
            if (cached.length > 0 || tenants.length > 0) {
              setTenantLoadError("");
              if (tenants.length === 0) {
                setTenants(cached);
              }
              return;
            }
            if (session?.user?.id && lastLoadedUserIdRef.current === session.user.id) {
              return;
            }
            devLog("refreshTenants:error@getSession", err?.message ?? err);
            setTenants([]);
            setTenantLoadError(err?.message ?? "Failed to load company memberships.");
          }
      }
      })
      .catch((err) => {
        devLog("getSession:error", err);
        setSession(null);
        setTenants([]);
        setTenantLoadError("");
        localStorage.removeItem("tenant_id");
        setSelectedTenantIdState(null);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange(async (event, next) => {
      devLog("onAuthStateChange", { event, hasSession: Boolean(next), userId: next?.user?.id });
      if (event === "INITIAL_SESSION") {
        return;
      }
      setSession(next);
      if (next) {
        if (lastLoadedUserIdRef.current === next.user.id && tenants.length > 0) {
          devLog("onAuthStateChange:skipRefresh", { userId: next.user.id });
          return;
        }
        try {
          await refreshTenants();
        } catch (err: any) {
          const cached = readCachedTenants();
          if (cached.length > 0 || tenants.length > 0) {
            setTenantLoadError("");
            if (tenants.length === 0) {
              setTenants(cached);
            }
            return;
          }
          if (lastLoadedUserIdRef.current === next.user.id && tenants.length > 0) {
            return;
          }
          devLog("refreshTenants:error@authChange", err?.message ?? err);
          setTenants([]);
          setTenantLoadError(err?.message ?? "Failed to load company memberships.");
        }
      } else {
        lastLoadedUserIdRef.current = null;
        setTenants([]);
        setTenantLoadError("");
        localStorage.removeItem("tenant_id");
        localStorage.removeItem(TENANT_CACHE_KEY);
        setSelectedTenantIdState(null);
      }
    });

    return () => {
      window.clearTimeout(loadingGuard);
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      tenants,
      tenantLoadError,
      selectedTenantId,
      setSelectedTenantId,
      refreshTenants,
      signOut: async () => {
        devLog("signOut:start");
        try {
          const { error } = await Promise.race([
            supabase.auth.signOut(),
            new Promise<{ error: Error }>((_, reject) => {
            window.setTimeout(() => reject(new Error("Logout timed out. Trying local signout fallback.")), 8000);
          })
        ]) as { error: Error | null };
          devLog("signOut:resolved", { hasError: Boolean(error), error: error?.message });
          if (error) throw new Error(error.message);
          clearLocalAuthState(setSession, setTenants, setTenantLoadError, setSelectedTenantIdState);
          return;
        } catch (primaryErr: any) {
          devLog("signOut:primaryError", primaryErr?.message ?? primaryErr);
          // Fallback: local scope signout usually completes even if global call hangs.
          const { error: localError } = await supabase.auth.signOut({ scope: "local" });
          devLog("signOut:fallbackLocalResolved", { hasError: Boolean(localError), error: localError?.message });
          clearLocalAuthState(setSession, setTenants, setTenantLoadError, setSelectedTenantIdState);
          if (localError) {
            throw new Error(`Local logout fallback failed: ${localError.message}`);
          }
        }
      }
    }),
    [session, loading, tenants, tenantLoadError, selectedTenantId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
