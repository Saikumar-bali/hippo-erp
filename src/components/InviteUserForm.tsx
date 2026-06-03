import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MailPlus, ShieldCheck, Sparkles, SquareChevronDown, SquareChevronUp, UserPlus2 } from "lucide-react";
import { toast } from "sonner";
import { inviteCompanyUser } from "../lib/invite-api";
import type { CompanyRole } from "../lib/roles-api";

type Props = {
  companyId: string;
  roles: CompanyRole[];
  canInviteUser: boolean;
  onInvited: () => Promise<void> | void;
  companyName?: string;
  membershipRole?: string;
};

const membershipRoles = ["viewer", "admin", "owner"] as const;

export function InviteUserForm({
  companyId,
  roles,
  canInviteUser,
  onInvited,
  companyName = "Current company",
  membershipRole = "admin",
}: Props) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedMembershipRole, setSelectedMembershipRole] = useState(membershipRole);
  const [selectedCompanyRoleId, setSelectedCompanyRoleId] = useState("");

  const selectedCompanyRole = useMemo(
    () => roles.find((role) => role.id === selectedCompanyRoleId) ?? null,
    [roles, selectedCompanyRoleId]
  );

  useEffect(() => {
    if (!roles.length) {
      setSelectedCompanyRoleId("");
      return;
    }

    if (!selectedCompanyRoleId || !roles.some((role) => role.id === selectedCompanyRoleId)) {
      setSelectedCompanyRoleId(roles[0].id);
    }
  }, [roles, selectedCompanyRoleId]);

  useEffect(() => {
    setSelectedMembershipRole(membershipRole);
  }, [membershipRole]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canInviteUser || loading) return;

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      toast.error("Please enter both a full name and email address.");
      return;
    }

    setLoading(true);
    try {
      await inviteCompanyUser({
        companyId,
        fullName: trimmedName,
        email: trimmedEmail,
        membershipRole: selectedMembershipRole,
        companyRoleId: selectedCompanyRoleId || null,
      });
      toast.success(`Invite sent to ${trimmedEmail}.`);
      setFullName("");
      setEmail("");
      setSelectedMembershipRole(membershipRole);
      setSelectedCompanyRoleId(roles[0]?.id ?? "");
      await onInvited();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send invite.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (!canInviteUser) {
    return null;
  }

  return (
    <section className="card invite-card">
      <div className="invite-card-head">
        <div className="invite-card-title">
          <div className="invite-card-kicker">
            <span className="invite-card-icon">
              <UserPlus2 size={14} />
            </span>
            <span>People provisioning</span>
          </div>
          <h3>Invite user</h3>
          <p>Send an invite email and attach company access in one step.</p>
        </div>

        <button type="button" className="logout invite-toggle" onClick={() => setOpen((value) => !value)}>
          {open ? <SquareChevronUp size={14} /> : <SquareChevronDown size={14} />}
          {open ? "Collapse" : "Invite user"}
        </button>
      </div>

      <div className="invite-summary">
        <article>
          <span>Target company</span>
          <strong>{companyName}</strong>
        </article>
        <article>
          <span>Default membership</span>
          <strong>{selectedMembershipRole}</strong>
        </article>
        <article>
          <span>Company role</span>
          <strong>{selectedCompanyRole?.role_name ?? "No company role yet"}</strong>
        </article>
      </div>

      {open ? (
        <form className="invite-form" onSubmit={submit}>
          <label className="invite-field">
            <span>Full name</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter full name"
              autoComplete="name"
            />
          </label>

          <label className="invite-field">
            <span>Email address</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              autoComplete="email"
            />
          </label>

          <label className="invite-field">
            <span>Membership role</span>
            <select value={selectedMembershipRole} onChange={(event) => setSelectedMembershipRole(event.target.value)}>
              {membershipRoles.map((role) => (
                <option key={role} value={role}>
                  Membership: {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="invite-field">
            <span>Invite access role</span>
            <select value={selectedCompanyRoleId} onChange={(event) => setSelectedCompanyRoleId(event.target.value)}>
              <option value="">No company role yet</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </label>

          <div className="invite-help">
            <ShieldCheck size={14} />
            The user receives a secure invite email. Membership and company role are applied immediately by the admin workflow.
          </div>

          <div className="invite-actions">
            <button type="button" className="logout" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="primary-action" type="submit" disabled={loading}>
              <MailPlus size={14} />
              {loading ? "Sending..." : "Send invite"}
            </button>
          </div>
        </form>
      ) : (
        <div className="invite-collapsed">
          <div>
            <strong>Invite flow ready</strong>
            <p>Open the form to add a person, set membership, and attach a company role.</p>
          </div>
          <button type="button" className="primary-action" onClick={() => setOpen(true)}>
            <Sparkles size={14} />
            Open invite form
          </button>
        </div>
      )}
    </section>
  );
}
