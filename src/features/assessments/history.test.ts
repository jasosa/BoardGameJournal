import { describe, expect, it } from "vitest";
import { currentAssessment, formatScore, sortLatestFirst } from "./history";
import type { Assessment } from "./schemas";

function assessment(
  id: string,
  assessedOn: string,
  createdAt: string,
  overall = 7,
): Assessment {
  return {
    id,
    gameId: "g",
    assessedOn,
    overall,
    createdAt,
  };
}

describe("currentAssessment", () => {
  it("is null with no assessments", () => {
    expect(currentAssessment([])).toBeNull();
  });

  it("picks the newest date, whatever the order", () => {
    const list = [
      assessment("a", "2024-01-01", "2024-01-01T10:00:00Z"),
      assessment("b", "2024-03-01", "2024-03-01T10:00:00Z"),
      assessment("c", "2024-02-01", "2024-02-01T10:00:00Z"),
    ];
    expect(currentAssessment(list)?.id).toBe("b");
    expect(currentAssessment([...list].reverse())?.id).toBe("b");
  });

  it("breaks a tie on the date by the one logged last", () => {
    const list = [
      assessment("a", "2024-03-01", "2024-03-01T08:00:00Z"),
      assessment("b", "2024-03-01", "2024-03-01T09:00:00Z"),
    ];
    expect(currentAssessment(list)?.id).toBe("b");
  });
});

describe("sortLatestFirst", () => {
  it("orders like currentAssessment and does not change the input", () => {
    const list = [
      assessment("a", "2024-01-01", "2024-01-01T10:00:00Z"),
      assessment("b", "2024-03-01", "2024-03-01T08:00:00Z"),
      assessment("c", "2024-03-01", "2024-03-01T09:00:00Z"),
    ];
    expect(sortLatestFirst(list).map((item) => item.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(list.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });
});

describe("formatting", () => {
  it("shows whole numbers without a decimal", () => {
    expect(formatScore(8)).toBe("8");
    expect(formatScore(8.5)).toBe("8.5");
    expect(formatScore(0)).toBe("0");
  });
});
