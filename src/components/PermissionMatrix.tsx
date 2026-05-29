import type { PermissionGroup } from "../lib/permissions";

type Props = {
  groups: PermissionGroup[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  disabled?: boolean;
};

export function PermissionMatrix({ groups, selected, onToggle, disabled }: Props) {
  return (
    <div className="permission-matrix">
      {groups.map((group) => (
        <section className="permission-group" key={group.module_key}>
          <div className="permission-group-head">
            <h4>{group.module_label}</h4>
            <span>{group.permissions.length} permissions</span>
          </div>
          <div className="permission-chips">
            {group.permissions.map((permission) => {
              const active = selected.has(permission.permission_key);
              return (
                <button
                  key={permission.permission_key}
                  type="button"
                  className={`permission-chip ${active ? "active" : ""}`}
                  onClick={() => onToggle(permission.permission_key)}
                  disabled={disabled}
                  title={permission.description ?? permission.permission_label}
                >
                  {permission.permission_label}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
