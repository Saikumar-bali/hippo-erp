import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { getCompanyProfile, updateCompanyProfile } from "../lib/company-api";
import { validateCompanyProfile } from "../lib/company-validation";
import { AccessDenied } from "./AccessDenied";

type Props = {
  canUpdate?: boolean;
};

export function CompanyProfileView({ canUpdate = true }: Props) {
  const { selectedTenantId, tenants, refreshTenants } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [financialYearStart, setFinancialYearStart] = useState("");

  const selectedCompany = useMemo(
    () => tenants.find((item) => item.id === selectedTenantId) ?? null,
    [tenants, selectedTenantId]
  );

  useEffect(() => {
    const run = async () => {
      if (!selectedTenantId) {
        setName("");
        setCode("");
        setEditing(false);
        return;
      }
      setLoading(true);
      try {
        const profile = await getCompanyProfile(selectedTenantId);
        setName(profile?.name ?? selectedCompany?.name ?? "");
        setCode(profile?.slug ?? selectedCompany?.slug ?? "");
        setGstNumber(profile?.gst_number ?? "");
        setEmail(profile?.email ?? "");
        setPhone(profile?.phone ?? "");
        setAddress(profile?.address ?? "");
        setLogoUrl(profile?.logo_url ?? "");
        setIndustryType(profile?.industry_type ?? "");
        setCurrencyCode(profile?.currency_code ?? "");
        setFinancialYearStart(profile?.financial_year_start ?? "");
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to load company profile.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [selectedTenantId, selectedCompany?.name, selectedCompany?.slug]);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    setSaving(true);
    try {
      const validation = validateCompanyProfile({
        name,
        code,
        gstNumber,
        email,
        phone,
        address,
        logoUrl,
        industryType,
        currencyCode,
        financialYearStart
      });
      if (!validation.ok) {
        toast.error(validation.errors[0]);
        return;
      }
      await updateCompanyProfile({
        id: selectedTenantId,
        name,
        slug: code,
        gst_number: gstNumber || null,
        email,
        phone,
        address,
        logo_url: logoUrl || null,
        industry_type: industryType,
        currency_code: currencyCode,
        financial_year_start: financialYearStart
      });
      await refreshTenants();
      toast.success("Company profile updated.");
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update company profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!selectedTenantId) {
    return <div className="card state-info">Select a company to manage its profile.</div>;
  }

  if (!loading && editing && !canUpdate) {
    return (
      <div className="module-stack company-profile-stack">
        <AccessDenied
          title="Company profile"
          requiredPermissions={["update_company"]}
          message="Your current company role can view this profile, but it cannot edit company settings."
        />
      </div>
    );
  }

  return (
    <div className="module-stack company-profile-stack">
      {loading && <div className="card state-info">Loading company profile...</div>}

      {!loading && !editing && (
        <section className="card company-profile-card">
          <div className="company-profile-head">
            <div className="company-profile-brand">
              {logoUrl ? <img src={logoUrl} alt={`${name} logo`} /> : <div className="company-profile-logo-fallback">{(name || "C").slice(0, 1).toUpperCase()}</div>}
              <div>
                <h3>{name || "Company name not set"}</h3>
                <p>{code ? `Code: ${code}` : "Company code not set"}</p>
              </div>
            </div>
            {canUpdate ? (
              <button className="primary-action" type="button" onClick={() => setEditing(true)}>
                Edit Profile
              </button>
            ) : (
              <span className="mini-badge mini-badge--muted">View only</span>
            )}
          </div>

          <div className="company-profile-grid">
            <article><h4>Email</h4><p>{email || "-"}</p></article>
            <article><h4>Phone</h4><p>{phone || "-"}</p></article>
            <article><h4>Industry</h4><p>{industryType || "-"}</p></article>
            <article><h4>Currency</h4><p>{currencyCode || "-"}</p></article>
            <article><h4>Financial Year Start</h4><p>{financialYearStart || "-"}</p></article>
            <article><h4>GST Number</h4><p>{gstNumber || "-"}</p></article>
            <article className="company-profile-wide"><h4>Address</h4><p>{address || "-"}</p></article>
            <article className="company-profile-wide"><h4>Logo URL</h4><p>{logoUrl || "-"}</p></article>
          </div>
        </section>
      )}

      {!loading && editing && canUpdate && (
        <form onSubmit={save} className="card form-grid company-profile-edit">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" required />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Company code" required />
          <input value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase())} placeholder="GST number (optional)" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" required />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" required />
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Logo URL (optional)" type="url" />
          <input value={industryType} onChange={(e) => setIndustryType(e.target.value)} placeholder="Industry type" required />
          <input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} placeholder="Currency (INR/USD)" required />
          <input value={financialYearStart} onChange={(e) => setFinancialYearStart(e.target.value)} type="date" required />
          <div className="company-profile-actions">
            <button className="primary-action" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
            <button className="logout" type="button" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
