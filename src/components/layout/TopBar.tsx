import { LogOut } from "lucide-react";
import { TenantSelector } from "../TenantSelector";

type Props = {
  userEmail: string | undefined;
  signingOut: boolean;
  onLogout: () => void;
};

export function TopBar({ userEmail, signingOut, onLogout }: Props) {
  return (
    <header className="topbar">
      <TenantSelector />
      <div className="user">{userEmail}</div>
      <button className="logout" onClick={onLogout} disabled={signingOut}>
        <LogOut size={14} /> {signingOut ? "Logging out..." : "Logout"}
      </button>
    </header>
  );
}
