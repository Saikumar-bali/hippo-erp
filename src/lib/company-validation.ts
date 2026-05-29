const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-() ]{7,20}$/;
const GST_REGEX = /^[0-9A-Z]{15}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

export function validateCompanyProfile(input: {
  name: string;
  code: string;
  gstNumber: string;
  email: string;
  phone: string;
  address: string;
  logoUrl: string;
  industryType: string;
  currencyCode: string;
  financialYearStart: string;
}) {
  const errors: string[] = [];
  const gst = input.gstNumber.trim().toUpperCase();
  const currency = input.currencyCode.trim().toUpperCase();

  if (!input.name.trim()) errors.push("Company name is required.");
  if (!input.code.trim()) errors.push("Company code is required.");
  if (!input.email.trim()) errors.push("Email is required.");
  if (!input.phone.trim()) errors.push("Phone is required.");
  if (!input.address.trim()) errors.push("Address is required.");
  if (!input.industryType.trim()) errors.push("Industry type is required.");
  if (!currency) errors.push("Currency is required.");
  if (!input.financialYearStart) errors.push("Financial year start is required.");

  if (input.email.trim() && !EMAIL_REGEX.test(input.email.trim())) errors.push("Email format is invalid.");
  if (input.phone.trim() && !PHONE_REGEX.test(input.phone.trim())) errors.push("Phone format is invalid.");
  if (gst && !GST_REGEX.test(gst)) errors.push("GST format is invalid. Use 15 uppercase letters/numbers.");
  if (currency && !CURRENCY_REGEX.test(currency)) errors.push("Currency must be a 3-letter uppercase code (e.g. INR).");
  if (input.logoUrl.trim()) {
    try {
      new URL(input.logoUrl.trim());
    } catch {
      errors.push("Logo must be a valid URL.");
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
