import { describe, expect, it } from "vitest";
import {
  COLLECTION_STATUSES,
  STATUS_LABELS,
  TITLE_MAX_LENGTH,
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
