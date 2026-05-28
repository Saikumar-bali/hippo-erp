import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Boxes, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

export function UpdatePasswordRoute() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!data.session) {
          setError("Reset link is invalid or expired. Request a new reset email.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Password updated successfully. Redirecting to login...");
    window.setTimeout(() => navigate("/login", { replace: true }), 1200);
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label="Hippo ERP password update">
        <div className="auth-brand">
          <span className="brand-mark"><Boxes size={22} /></span>
          <span>Hippo ERP</span>
        </div>
        <div className="auth-copy">
          <p className="eyebrow">Secure recovery</p>
          <h1>Set a new password.</h1>
          <p>
            This step finishes your recovery link flow and secures access to your
            inventory workspace.
          </p>
        </div>
      </section>

      <section className="auth-card" aria-label="Update password form">
        <div className="auth-card-header">
          <div className="auth-icon"><ShieldCheck size={22} /></div>
          <div>
            <p className="eyebrow">Recovery complete</p>
            <h2>Choose new password</h2>
          </div>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>New password</span>
            <div className="input-wrap">
              <Lock size={18} />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                type="password"
                autoComplete="new-password"
              />
            </div>
          </label>

          <label>
            <span>Confirm password</span>
            <div className="input-wrap">
              <Lock size={18} />
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                type="password"
                autoComplete="new-password"
              />
            </div>
          </label>

          {success && <p className="form-success">{success}</p>}
          {error && <p className="form-alert" role="alert">{error}</p>}

          <button className="primary-action" type="submit" disabled={loading || saving}>
            {saving ? "Saving..." : "Update password"} <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-links single">
          <Link to="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}
