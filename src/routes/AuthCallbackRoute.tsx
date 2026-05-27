import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function AuthCallbackRoute() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/"); }, [navigate]);
  return <div>Completing authentication...</div>;
}
