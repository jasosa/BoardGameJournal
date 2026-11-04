import { describe, expect, it } from "vitest";
import { addAssessmentInput } from "./schemas";

const GAME = "00000000-0000-4000-8000-000000000001";
const parse = (patch: Record<string, unknown>) =>
  addAssessmentInput.safeParse({ gameId: GAME, overall: "8", ...patch });

describe("addAssessmentInput", () => {
  it("accepts a whole number, a decimal and a comma decimal", () => {
    for (const [raw, expected] of [
      ["0", 0],
      ["8", 8],
      ["8.5", 8.5],
      ["8,5", 8.5],
      ["10", 10],
      [" 7.0 ", 7],
    ] as const) {
      const result = parse({ overall: raw });
      expect(result.success && result.data.overall).toBe(expected);
    }
  });

  it("refuses a missing, out of range or too precise overall", () => {
    for (const raw of ["", "  ", "abc", "10.1", "11", "-1", "8.55", "1e1"]) {
      expect(parse({ overall: raw }).success).toBe(false);
    }
    expect(addAssessmentInput.safeParse({ gameId: GAME }).success).toBe(false);
  });

  it("treats a blank date as not given, and checks a given one", () => {
    const blank = parse({ assessedOn: "" });
    expect(blank.success && blank.data.assessedOn).toBeUndefined();
    expect(parse({ assessedOn: "2999-01-01" }).success).toBe(false);
    expect(parse({ assessedOn: "2024-05-01" }).success).toBe(true);
  });

  it("reports the problem under the overall field", () => {
    const bad = parse({ overall: "11" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0]?.path).toEqual(["overall"]);
  });

  it("needs a real game id", () => {
    expect(parse({ gameId: "nope" }).success).toBe(false);
  });
});
