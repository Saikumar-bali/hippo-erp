import { LogOut } from "lucide-react";
import { TenantSelector } from "../TenantSelector";

type Props = {
  userEmail: string | undefined;
  companyName?: string;
  logoUrl?: string | null;
  signingOut: boolean;
  onLogout: () => void;
};

export function TopBar({ userEmail, companyName = "Hippo ERP", logoUrl, signingOut, onLogout }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-brand">{logoUrl ? <img className="brand-logo" src={logoUrl} alt={`${companyName} logo`} /> : null}<TenantSelector /></div>
      <div className="user">{userEmail}</div>
      <button className="logout" onClick={onLogout} disabled={signingOut}>
        <LogOut size={14} /> {signingOut ? "Logging out..." : "Logout"}
      </button>
    </header>
  );
}
