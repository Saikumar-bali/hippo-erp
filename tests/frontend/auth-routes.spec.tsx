import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { signUp, resetPasswordForEmail, getSession, navigateMock } = vi.hoisted(() => ({
  signUp: vi.fn(async () => ({ error: null })),
  resetPasswordForEmail: vi.fn(async () => ({ error: null })),
  getSession: vi.fn(async () => ({ data: { session: null } })),
  navigateMock: vi.fn()
}));

vi.mock("../../src/lib/supabase", () => ({
  supabase: {
    auth: {
      signUp,
      resetPasswordForEmail,
      getSession
    }
  }
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

import { SignupRoute } from "../../src/routes/SignupRoute";
import { ResetPasswordRoute } from "../../src/routes/ResetPasswordRoute";
import { AuthCallbackRoute } from "../../src/routes/AuthCallbackRoute";

describe("auth routes redirect wiring", () => {
  it("signup passes options.emailRedirectTo", async () => {
    render(<MemoryRouter><SignupRoute /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "t@e.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(signUp).toHaveBeenCalled());
    const arg = (signUp as any).mock.calls[0]?.[0] as { options: { emailRedirectTo: string } } | undefined;
    expect(arg?.options.emailRedirectTo).toBe(`${window.location.origin}/auth/callback`);
  });

  it("reset password passes redirectTo", async () => {
    render(<MemoryRouter><ResetPasswordRoute /></MemoryRouter>);
    const emailInput = screen.getAllByPlaceholderText("Email").at(-1);
    if (!emailInput) throw new Error("Email input not found");
    fireEvent.change(emailInput, { target: { value: "t@e.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalled());
    const options = (resetPasswordForEmail as any).mock.calls[0]?.[1] as { redirectTo: string } | undefined;
    expect(options?.redirectTo).toBe(`${window.location.origin}/auth/callback`);
  });

  it("callback waits for session fetch then redirects", async () => {
    render(<MemoryRouter><AuthCallbackRoute /></MemoryRouter>);
    await waitFor(() => expect(getSession).toHaveBeenCalled());
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/", { replace: true }));
  });
});
