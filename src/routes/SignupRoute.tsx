import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Boxes, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getAuthRedirectUrl } from "../lib/auth-redirect";

export function SignupRoute() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: getAuthRedirectUrl()
      }
    });
    if (error) return setError(error.message);
    navigate("/");
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label="Hippo ERP onboarding">
        <div className="auth-brand">
          <span className="brand-mark"><Boxes size={22} /></span>
          <span>Hippo ERP</span>
        </div>
        <div className="auth-copy">
          <p className="eyebrow">Company-ready inventory</p>
          <h1>Create a secure workspace for warehouse teams.</h1>
          <p>
            Start with Supabase Auth, company membership, and RLS-backed inventory
            operations from the first login.
          </p>
        </div>
        <div className="auth-metrics" aria-label="Security highlights">
          <div><strong>Auth</strong><span>Supabase</span></div>
          <div><strong>RLS</strong><span>Company scope</span></div>
          <div><strong>UI</strong><span>ERP console</span></div>
        </div>
      </section>

      <section className="auth-card" aria-label="Signup form">
        <div className="auth-card-header">
          <div className="auth-icon"><ShieldCheck size={22} /></div>
          <div>
            <p className="eyebrow">Demo / testing only</p>
            <h2>Signup</h2>
          </div>
        </div>

        <div className="card state-info state-note">
          Real company access is admin-provisioned. Use this form for sandbox/demo users, then assign company membership and role from <strong>Users and roles</strong>.
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Full name</span>
            <div className="input-wrap">
              <UserRound size={18} />
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" autoComplete="name" />
            </div>
          </label>
          <label>
            <span>Email</span>
            <div className="input-wrap">
              <Mail size={18} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" />
            </div>
          </label>
          <label>
            <span>Password</span>
            <div className="input-wrap">
              <LockKeyhole size={18} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete="new-password" />
            </div>
          </label>

          {error && <p className="form-alert" role="alert">{error}</p>}

          <button className="primary-action" type="submit">
            Create account <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-links single">
          <Link to="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}
