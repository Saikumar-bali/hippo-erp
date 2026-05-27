import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AuthCallbackRoute() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().finally(() => navigate("/", { replace: true }));
  }, [navigate]);
  return <div>Completing authentication...</div>;
}
