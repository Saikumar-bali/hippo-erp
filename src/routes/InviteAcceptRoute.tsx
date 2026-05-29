import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Boxes, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

export function InviteAcceptRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyId = useMemo(() => searchParams.get("company_id") ?? "", [searchParams]);
  const [email, setEmail] = useState("");
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
        const session = data.session;
        if (!session?.user?.email) {
          setError("Invitation link is invalid or expired. Please open the invite from the invited email inbox.");
          return;
        }
        setEmail(session.user.email);
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

    const { error: acceptError } = await supabase.rpc("accept_company_invite", {
      p_company_id: companyId || null
    });
    if (acceptError) {
      setError(acceptError.message);
      return;
    }

    toast.success("Invitation accepted. Your company access is now active.");
    setSuccess("Invitation accepted. Your password is set and your company access is ready.");
    window.setTimeout(() => navigate("/", { replace: true }), 1200);
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label="Hippo ERP invitation acceptance">
        <div className="auth-brand">
          <span className="brand-mark"><Boxes size={22} /></span>
          <span>Hippo ERP</span>
        </div>
        <div className="auth-copy">
          <p className="eyebrow">Company invitation</p>
          <h1>Welcome to your company workspace.</h1>
          <p>
            Complete your account setup from the mailbox that received the invitation.
            This keeps your company access tied to the correct email address and role.
          </p>
        </div>
        <div className="auth-metrics" aria-label="Invitation highlights">
          <div><strong>Secure</strong><span>Invite only</span></div>
          <div><strong>Email</strong><span>Mailbox locked</span></div>
          <div><strong>Ready</strong><span>Company access</span></div>
        </div>
      </section>

      <section className="auth-card" aria-label="Accept invitation form">
        <div className="auth-card-header">
          <div className="auth-icon"><ShieldCheck size={22} /></div>
          <div>
            <p className="eyebrow">Invitation accepted</p>
            <h2>Set your password</h2>
          </div>
        </div>

        <div className="card state-info state-note">
          {loading
            ? "Checking your invitation..."
            : `This invite is linked to ${email || "your invited email"}. Use that mailbox to complete setup${companyId ? ` for the selected company.` : "."}`}
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Invited email</span>
            <div className="input-wrap">
              <Mail size={18} />
              <input value={email} readOnly placeholder="Invited email" />
            </div>
          </label>

          <label>
            <span>New password</span>
            <div className="input-wrap">
              <Lock size={18} />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Create password"
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
                type="password"
                placeholder="Confirm password"
                autoComplete="new-password"
              />
            </div>
          </label>

          {success && <p className="form-success"><Sparkles size={16} /> {success}</p>}
          {error && <p className="form-alert" role="alert">{error}</p>}

          <button className="primary-action" type="submit" disabled={loading || saving || !email}>
            {saving ? "Saving..." : "Complete setup"} <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-links single">
          <Link to="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}
