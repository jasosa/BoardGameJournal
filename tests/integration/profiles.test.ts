import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./helpers";

describe("profiles RLS", () => {
  let a: TestUser;
  let b: TestUser;

  beforeAll(async () => {
    a = await createTestUser("profile-a");
    b = await createTestUser("profile-b");
  });
  afterAll(deleteTestUsers);

  it("creates a profile row on sign up", async () => {
    const { data } = await admin
      .from("profiles")
      .select("user_id")
      .eq("user_id", a.id);
    expect(data).toHaveLength(1);
  });

  it("lets a user read only their own profile", async () => {
    const { data } = await a.client.from("profiles").select("user_id");
    expect(data?.map((p) => p.user_id)).toEqual([a.id]);
  });

  it("lets a user update their own profile", async () => {
    const { data, error } = await a.client
      .from("profiles")
      .update({ display_name: "Alice" })
      .eq("user_id", a.id)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("does not let B update A's profile", async () => {
    const { data } = await b.client
      .from("profiles")
      .update({ display_name: "Hacked" })
      .eq("user_id", a.id)
      .select();
    expect(data).toEqual([]);
    const { data: row } = await admin
      .from("profiles")
      .select("display_name")
      .eq("user_id", a.id)
      .single();
    expect(row?.display_name).not.toBe("Hacked");
  });

  it("does not let B insert a profile for A", async () => {
    const { error } = await b.client.from("profiles").insert({ user_id: a.id });
    expect(error).not.toBeNull();
  });

  it("does not let B delete A's profile", async () => {
    await b.client.from("profiles").delete().eq("user_id", a.id);
    const { data } = await admin
      .from("profiles")
      .select("user_id")
      .eq("user_id", a.id);
    expect(data).toHaveLength(1);
  });
});

describe("public sign-up (ADR-0006)", () => {
  it("is rejected for anonymous visitors", async () => {
    const { anonymousClient } = await import("./helpers");
    const { data, error } = await anonymousClient().auth.signUp({
      email: `walkin-${Date.now()}@test.local`,
      password: "a-long-enough-password",
    });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});
