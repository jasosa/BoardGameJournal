import { describe, expect, it } from "vitest";
import {
  COLLECTION_STATUSES,
  STATUS_LABELS,
  TITLE_MAX_LENGTH,
  addGameCopyInput,
  addManualGameInput,
} from "./schemas";

describe("addManualGameInput", () => {
  it("accepts a title and a status", () => {
    const parsed = addManualGameInput.parse({
      title: "Wingspan",
      status: "owned",
    });
    expect(parsed).toEqual({ title: "Wingspan", status: "owned" });
  });

  it("trims the title", () => {
    const parsed = addManualGameInput.parse({
      title: "  Cascadia  ",
      status: "wishlist",
    });
    expect(parsed.title).toBe("Cascadia");
  });

  it("rejects a blank title", () => {
    const result = addManualGameInput.safeParse({
      title: "   ",
      status: "owned",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a title over the limit and accepts one at the limit", () => {
    const at = "a".repeat(TITLE_MAX_LENGTH);
    expect(
      addManualGameInput.safeParse({ title: at, status: "owned" }).success,
    ).toBe(true);
    expect(
      addManualGameInput.safeParse({ title: at + "a", status: "owned" })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown or missing status", () => {
    expect(
      addManualGameInput.safeParse({ title: "X", status: "stolen" }).success,
    ).toBe(false);
    expect(addManualGameInput.safeParse({ title: "X" }).success).toBe(false);
  });
});

describe("statuses", () => {
  it("has a label for every status", () => {
    for (const status of COLLECTION_STATUSES) {
      expect(STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });
});

describe("addGameCopyInput", () => {
  const gameId = "7b0e2f57-4f1d-4c6e-9d57-0c1f6f0a1b2c";

  it("accepts a game id and a status", () => {
    const r = addGameCopyInput.safeParse({ gameId, status: "owned" });
    expect(r.success).toBe(true);
  });

  it("refuses a bad id, a bad status and a future date", () => {
    expect(
      addGameCopyInput.safeParse({ gameId: "nope", status: "owned" }).success,
    ).toBe(false);
    expect(addGameCopyInput.safeParse({ gameId, status: "x" }).success).toBe(
      false,
    );
    expect(
      addGameCopyInput.safeParse({
        gameId,
        status: "owned",
        addedOn: "2999-01-01",
      }).success,
    ).toBe(false);
  });

  it("treats a blank date as today", () => {
    const r = addGameCopyInput.safeParse({
      gameId,
      status: "owned",
      addedOn: "",
    });
    expect(r.success && r.data.addedOn).toBeUndefined();
  });
});
