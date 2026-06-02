import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "./styles.css";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { LoginRoute } from "./routes/LoginRoute";
import { SignupRoute } from "./routes/SignupRoute";
import { ResetPasswordRoute } from "./routes/ResetPasswordRoute";
import { AuthCallbackRoute } from "./routes/AuthCallbackRoute";
import { UpdatePasswordRoute } from "./routes/UpdatePasswordRoute";
import { InviteAcceptRoute } from "./routes/InviteAcceptRoute";

function HashAuthBridge() {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!location.hash || location.pathname !== "/") return;
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    const hasToken = params.has("access_token");
    const type = params.get("type");
    if (hasToken && type) {
      navigate({ pathname: "/auth/callback", hash: location.hash }, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <HashAuthBridge />
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/signup" element={<SignupRoute />} />
          <Route path="/reset" element={<ResetPasswordRoute />} />
          <Route path="/reset/update" element={<UpdatePasswordRoute />} />
          <Route path="/invite/accept" element={<InviteAcceptRoute />} />
          <Route path="/auth/callback" element={<AuthCallbackRoute />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<App />} />
            <Route path="/:pageKey" element={<App />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
