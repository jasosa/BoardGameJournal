import { describe, expect, it } from "vitest";
import { describeChange, formatChangeDate, groupByEntry } from "./history";
import {
  COLLECTION_STATUSES,
  changeEntryStatusInput,
  type StatusChange,
} from "./schemas";

const change = (
  over: Partial<StatusChange> & Pick<StatusChange, "entryId">,
): StatusChange => ({
  id: crypto.randomUUID(),
  from: "wishlist",
  to: "owned",
  changedOn: "2026-01-01",
  recordedAt: "2026-01-01T10:00:00Z",
  ...over,
});

describe("describeChange", () => {
  it("names the first row as the game being added", () => {
    expect(describeChange({ from: null, to: "wishlist" })).toBe(
      "Added as Wishlist",
    );
    expect(describeChange({ from: null, to: "previously_owned" })).toBe(
      "Added as Previously owned",
    );
  });

  it("shows from and to for every transition", () => {
    for (const from of COLLECTION_STATUSES) {
      for (const to of COLLECTION_STATUSES) {
        if (from === to) continue;
        expect(describeChange({ from, to })).toMatch(/ → /);
      }
    }
    expect(describeChange({ from: "wishlist", to: "owned" })).toBe(
      "Wishlist → Owned",
    );
    expect(describeChange({ from: "owned", to: "previously_owned" })).toBe(
      "Owned → Previously owned",
    );
  });
});

describe("formatChangeDate", () => {
  it("writes a plain date the same in every time zone", () => {
    expect(formatChangeDate("2019-06-01")).toBe("1 June 2019");
    expect(formatChangeDate("2026-12-31")).toBe("31 December 2026");
    expect(formatChangeDate("2024-02-29")).toBe("29 February 2024");
  });
});

describe("groupByEntry", () => {
  it("keeps each copy's changes together and in order", () => {
    const a1 = change({ entryId: "a", changedOn: "2026-03-01" });
    const b1 = change({ entryId: "b" });
    const a2 = change({ entryId: "a", changedOn: "2026-02-01" });
    const groups = groupByEntry([a1, b1, a2]);
    expect([...groups.keys()]).toEqual(["a", "b"]);
    expect(groups.get("a")).toEqual([a1, a2]);
    expect(groups.get("b")).toEqual([b1]);
  });

  it("returns nothing for no changes", () => {
    expect(groupByEntry([]).size).toBe(0);
  });
});

describe("changeEntryStatusInput date", () => {
  const entryId = "6f1d5c9e-3c53-4c5b-8a39-6a0b8a1f2d10";
  const parse = (changedOn?: string) =>
    changeEntryStatusInput.safeParse({ entryId, status: "owned", changedOn });
  const daysFromNow = (days: number) =>
    new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  it("treats a blank or missing date as today", () => {
    for (const value of [undefined, "", "  "]) {
      const result = parse(value);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.changedOn).toBeUndefined();
    }
  });

  it("accepts real past dates, today and tomorrow", () => {
    for (const value of [
      "1900-01-01",
      "2019-06-01",
      daysFromNow(0),
      daysFromNow(1),
    ]) {
      expect(parse(value).success, value).toBe(true);
    }
  });

  it("refuses the future, impossible dates, and dates before 1900", () => {
    for (const value of [
      daysFromNow(2),
      "2999-01-01",
      "2026-02-30",
      "2026-13-01",
      "not-a-date",
      "1899-12-31",
      "01/06/2019",
    ]) {
      expect(parse(value).success, value).toBe(false);
    }
  });

  it("says what is wrong with a future date", () => {
    const result = parse(daysFromNow(5));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Choose a date that is not in the future.",
      );
    }
  });
});
