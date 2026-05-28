import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AuthCallbackRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = params.get("type");
    const target = type === "recovery" ? "/reset/update" : "/";
    supabase.auth.getSession().finally(() => navigate(target, { replace: true }));
  }, [navigate]);

  return <div>Completing authentication...</div>;
}
