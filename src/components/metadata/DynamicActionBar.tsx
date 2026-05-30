import type { DocTypeActionMeta } from "../../lib/metadata/types";

type Props = {
  actions: DocTypeActionMeta[];
  permissionChecker: (permissionKey: string) => boolean;
  onAction: (actionKey: string) => void;
  recordActive?: boolean;
};

export function DynamicActionBar({ actions, permissionChecker, onAction, recordActive }: Props) {
  const visibleActions = actions.filter((a) => {
    if (!permissionChecker(a.permission_key)) return false;
    if (a.action_key === "deactivate" && recordActive === false) return false;
    return true;
  });

  if (visibleActions.length === 0) return null;

  return (
    <div className="action-group">
      {visibleActions.map((a) => {
        const isDeactivate = a.action_key === "deactivate";
        const isPrimary = a.action_key === "create";
        return (
          <button
            key={a.action_key}
            className={
              isPrimary ? "primary-action" :
              isDeactivate ? "logout logout--danger" :
              "logout"
            }
            onClick={() => onAction(a.action_key)}
          >
            {a.action_key === "create" ? `+ ${a.action_key.charAt(0).toUpperCase() + a.action_key.slice(1)}` :
             a.action_key.charAt(0).toUpperCase() + a.action_key.slice(1)}
          </button>
        );
      })}
    </div>
  );
}
