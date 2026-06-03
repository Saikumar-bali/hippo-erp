import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Boxes, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function LoginRoute() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate("/", { replace: true });
    }
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
      return setError(error.message);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label="Hippo ERP sign in">
        <div className="auth-brand">
          <span className="brand-mark"><Boxes size={22} /></span>
          <span>Hippo ERP</span>
        </div>
        <div className="auth-copy">
          <p className="eyebrow">Inventory operations console</p>
          <h1>Run warehouses with clearer stock control.</h1>
          <p>
            Secure access for product masters, bins, GRN, transfers, cycle counts,
            reservations, and valuation workflows.
          </p>
        </div>
        <div className="auth-metrics" aria-label="Inventory highlights">
          <div><strong>23</strong><span>ERP tables</span></div>
          <div><strong>RLS</strong><span>Company security</span></div>
          <div><strong>RPC</strong><span>Stock ledger</span></div>
        </div>
      </section>

      <section className="auth-card" aria-label="Login form">
        <div className="auth-card-header">
          <div className="auth-icon"><ShieldCheck size={22} /></div>
          <div>
            <p className="eyebrow">Admin-provisioned access</p>
            <h2>Login</h2>
          </div>
        </div>

        <div className="card state-info state-note">
          Company access is granted by an admin through membership and company role assignment. If you received an invite, use the invite email first to set your password, then return here to sign in.
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Email</span>
            <div className="input-wrap">
              <Mail size={18} />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                autoComplete="email"
              />
            </div>
          </label>
          <label>
            <span>Password</span>
            <div className="input-wrap">
              <LockKeyhole size={18} />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
                autoComplete="current-password"
              />
            </div>
          </label>

          {error && <p className="form-alert" role="alert">{error}</p>}

          <button className="primary-action" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Login"} <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-links">
          <Link to="/signup">Create account</Link>
          <Link to="/reset">Reset password</Link>
        </div>
      </section>
    </main>
  );
}
