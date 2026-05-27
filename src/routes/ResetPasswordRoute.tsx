import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Boxes, Mail, RotateCcw, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

export function ResetPasswordRoute() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return setError(error.message);
    setMsg("Password reset email sent.");
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label="Hippo ERP account recovery">
        <div className="auth-brand">
          <span className="brand-mark"><Boxes size={22} /></span>
          <span>Hippo ERP</span>
        </div>
        <div className="auth-copy">
          <p className="eyebrow">Account recovery</p>
          <h1>Get your inventory console access back.</h1>
          <p>
            Send a secure Supabase reset link and return to warehouse operations
            without changing any inventory records.
          </p>
        </div>
        <div className="auth-metrics" aria-label="Recovery highlights">
          <div><strong>Email</strong><span>Reset flow</span></div>
          <div><strong>Safe</strong><span>No data edit</span></div>
          <div><strong>Fast</strong><span>Return access</span></div>
        </div>
      </section>

      <section className="auth-card" aria-label="Password reset form">
        <div className="auth-card-header">
          <div className="auth-icon"><RotateCcw size={22} /></div>
          <div>
            <p className="eyebrow">Secure reset</p>
            <h2>Password reset</h2>
          </div>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Email</span>
            <div className="input-wrap">
              <Mail size={18} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" />
            </div>
          </label>

          {msg && <p className="form-success"><ShieldCheck size={16} /> {msg}</p>}
          {error && <p className="form-alert" role="alert">{error}</p>}

          <button className="primary-action" type="submit">
            Send reset link <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-links single">
          <Link to="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}
