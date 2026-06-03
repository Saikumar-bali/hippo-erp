import { Lock } from "lucide-react";

type Props = {
  title: string;
  requiredPermissions: readonly string[];
  message?: string;
};

export function AccessDenied({ title, requiredPermissions, message }: Props) {
  return (
    <section className="card access-denied">
      <div className="access-denied-head">
        <div className="access-denied-icon">
          <Lock size={16} />
        </div>
        <div>
          <p className="eyebrow">Access denied</p>
          <h3>{title}</h3>
          <p>{message ?? "Your current company role does not include access to this screen."}</p>
        </div>
      </div>

      <div className="access-denied-perms">
        <span>Required permissions</span>
        <div className="access-denied-chips">
          {requiredPermissions.length === 0 ? <span className="mini-badge mini-badge--muted">No permission configured</span> : requiredPermissions.map((permission) => <span key={permission} className="mini-badge mini-badge--role">{permission}</span>)}
        </div>
      </div>
      {requiredPermissions.length > 0 && (
        <p style={{ marginTop: "12px", fontSize: "0.82rem", color: "#5b7188" }}>
          Fix path: open <strong>Access Control Manager</strong> and grant the required right to the user role.
        </p>
      )}
    </section>
  );
}
