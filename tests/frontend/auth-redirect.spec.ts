import { describe, expect, it } from "vitest";
import { buildAuthRedirectUrl, getAuthRedirectUrl } from "../../src/lib/auth-redirect";

describe("auth redirect url", () => {
  it("uses browser origin + /auth/callback", () => {
    expect(getAuthRedirectUrl()).toBe(`${window.location.origin}/auth/callback`);
  });

  it("supports localhost vite callback", () => {
    expect(buildAuthRedirectUrl("http://localhost:5173")).toBe("http://localhost:5173/auth/callback");
  });

  it("supports production callback", () => {
    expect(buildAuthRedirectUrl("https://hippo-erp.pages.dev")).toBe("https://hippo-erp.pages.dev/auth/callback");
  });
});
