import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/database/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
// Like Next's redirect, this never returns.
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { requireUser } from "./require-user";

describe("requireUser", () => {
  beforeEach(() => getUser.mockReset());

  it("returns the user and a client when the auth server confirms the session", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const result = await requireUser();
    expect(result.user.id).toBe("u1");
    expect(result.supabase).toBeDefined();
  });

  it("redirects to /login when there is no user", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /login when the auth server rejects the token", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid JWT" },
    });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("does not trust a user object that comes with an error", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: { message: "expired" },
    });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });
});
