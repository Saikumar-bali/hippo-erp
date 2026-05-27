import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./styles.css";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { LoginRoute } from "./routes/LoginRoute";
import { SignupRoute } from "./routes/SignupRoute";
import { ResetPasswordRoute } from "./routes/ResetPasswordRoute";
import { AuthCallbackRoute } from "./routes/AuthCallbackRoute";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/signup" element={<SignupRoute />} />
          <Route path="/reset" element={<ResetPasswordRoute />} />
          <Route path="/auth/callback" element={<AuthCallbackRoute />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<App />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
