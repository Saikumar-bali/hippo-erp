import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { signInWithPassword } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(async () => ({ error: { message: "Invalid credentials" } }))
}));

vi.mock("../../src/lib/supabase", () => ({
  supabase: { auth: { signInWithPassword } }
}));

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => ({ session: null })
}));

import { LoginRoute } from "../../src/routes/LoginRoute";

describe("auth state", () => {
  it("shows login error state", async () => {
    render(<MemoryRouter><LoginRoute /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText("Invalid credentials")).toBeTruthy();
  });
});
