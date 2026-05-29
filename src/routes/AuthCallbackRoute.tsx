import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AuthCallbackRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = params.get("type");
    const search = location.search;
    const target = type === "recovery" ? "/reset/update" : type === "invite" ? "/invite/accept" : "/";
    supabase.auth.getSession().finally(() => navigate({ pathname: target, search }, { replace: true }));
  }, [navigate, location.search]);

  return <div>Completing authentication...</div>;
}
