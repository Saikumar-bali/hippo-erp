const fallbackOrigin = "http://localhost:5173";

export function buildAuthRedirectUrl(origin: string, path = "/auth/callback") {
  return `${origin}${path}`;
}

export function getAuthRedirectUrl(path = "/auth/callback") {
  const origin = typeof window === "undefined" ? fallbackOrigin : window.location.origin;
  return buildAuthRedirectUrl(origin, path);
}
