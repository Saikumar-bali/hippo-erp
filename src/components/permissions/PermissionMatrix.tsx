import { STANDARD_ACCESS_RIGHTS, buildMissingRightsDiagnostics, formatPermissionLabel, type AccessMatrixTarget, type AccessRightKey } from "../../lib/access-control";

type Props = {
  target: AccessMatrixTarget | null;
  effectivePermissionKeys?: readonly string[];
  disabled?: boolean;
  onToggle: (rightKey: AccessRightKey, nextValue: boolean) => void;
};

export function PermissionMatrix({ target, effectivePermissionKeys = [], disabled, onToggle }: Props) {
  const diagnostics = buildMissingRightsDiagnostics(target, effectivePermissionKeys);

  if (!target) {
    return <div className="card state-info">Select a DocType, page, report, or menu target to edit its rights matrix.</div>;
  }

  return (
    <div className="studio-stack">
      <div className="studio-panel studio-panel--muted">
        <div className="studio-icon-title">
          <strong>{target.label}</strong>
          <span className="mini-badge mini-badge--muted">{target.targetType}</span>
          <span className="mini-badge mini-badge--role">{target.moduleLabel}</span>
        </div>
        <div className="studio-subtle">
          Rights here stay compatible with the current permission engine because every toggle maps back to a permission key in the existing company-role grant table.
        </div>
      </div>

      <div className="table-wrap" style={{ overflowX: "auto" }}>
        <table className="erp-table" style={{ minWidth: "100%" }}>
          <thead>
            <tr>
              <th>Right</th>
              <th>Permission Key</th>
              <th>Configured</th>
              <th>Role Grant</th>
              <th>User Effective</th>
            </tr>
          </thead>
          <tbody>
            {STANDARD_ACCESS_RIGHTS.map((rightKey) => {
              const row = target.rights[rightKey];
              const permissionKey = row?.permission_key ?? "";
              const effective = permissionKey ? effectivePermissionKeys.includes(permissionKey) : false;
              return (
                <tr key={rightKey}>
                  <td style={{ textTransform: "capitalize", fontWeight: 700 }}>{rightKey}</td>
                  <td>
                    {permissionKey ? (
                      <div style={{ display: "grid", gap: "4px" }}>
                        <code>{permissionKey}</code>
                        <span className="studio-subtle">{formatPermissionLabel(permissionKey)}</span>
                      </div>
                    ) : (
                      <span className="studio-subtle">Not applicable</span>
                    )}
                  </td>
                  <td>
                    {!row ? "—" : row.is_configured ? "Mapped" : "Will create on save"}
                  </td>
                  <td>
                    {!row ? (
                      <span className="studio-subtle">—</span>
                    ) : (
                      <label className="studio-check" style={{ minHeight: "36px" }}>
                        <input
                          type="checkbox"
                          checked={row.is_granted}
                          disabled={disabled}
                          onChange={(event) => onToggle(rightKey, event.target.checked)}
                        />
                        <span>{row.is_granted ? "Granted" : "Missing"}</span>
                      </label>
                    )}
                  </td>
                  <td>
                    {!row ? "—" : effective ? "Yes" : "No"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="studio-panel">
        <div className="studio-icon-title">
          <strong>Missing Access Diagnostics</strong>
          <span className={`mini-badge ${diagnostics.length === 0 ? "mini-badge--ok" : "mini-badge--off"}`}>
            {diagnostics.length === 0 ? "Ready" : `${diagnostics.length} missing`}
          </span>
        </div>
        {diagnostics.length === 0 ? (
          <div className="studio-subtle">The selected user already has every configured right for this target.</div>
        ) : (
          <div className="permission-chips">
            {diagnostics.map((item) => (
              <span key={`${item.rightKey}:${item.permissionKey}`} className="permission-pill" title={item.configured ? "Configured but not granted to the user yet." : "This right will create its permission mapping when you save."}>
                {item.rightKey}: {item.permissionKey}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
