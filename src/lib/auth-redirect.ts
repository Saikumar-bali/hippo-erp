const fallbackOrigin = "http://localhost:5173";

export function getAuthRedirectUrl(path = "/auth/callback") {
  const origin = typeof window === "undefined" ? fallbackOrigin : window.location.origin;
  return `${origin}${path}`;
}
