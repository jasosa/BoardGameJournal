import { describe, expect, it } from "vitest";
import { updateGameFactsInput } from "./schemas";

const gameId = "6f1d5c9e-3c53-4c5b-8a39-6a0b8a1f2d10";
const blank = {
  gameId,
  year: "",
  minPlayers: "",
  maxPlayers: "",
  playTimeMin: "",
  description: "",
};

describe("updateGameFactsInput", () => {
  it("turns blank fields into null", () => {
    expect(updateGameFactsInput.parse(blank)).toEqual({
      gameId,
      year: null,
      minPlayers: null,
      maxPlayers: null,
      playTimeMin: null,
      description: null,
    });
  });

  it("parses numbers and trims the description", () => {
    const parsed = updateGameFactsInput.parse({
      gameId,
      year: "2019",
      minPlayers: "1",
      maxPlayers: "5",
      playTimeMin: " 60 ",
      description: "  Engine building with birds.  ",
    });
    expect(parsed).toMatchObject({
      year: 2019,
      minPlayers: 1,
      maxPlayers: 5,
      playTimeMin: 60,
      description: "Engine building with birds.",
    });
  });

  it("rejects text, decimals and negatives in number fields", () => {
    for (const year of ["abc", "20.5", "-1", "1e3"]) {
      expect(updateGameFactsInput.safeParse({ ...blank, year }).success).toBe(
        false,
      );
    }
  });

  it("enforces ranges", () => {
    expect(
      updateGameFactsInput.safeParse({ ...blank, year: "0" }).success,
    ).toBe(false);
    expect(
      updateGameFactsInput.safeParse({ ...blank, year: "2201" }).success,
    ).toBe(false);
    expect(
      updateGameFactsInput.safeParse({ ...blank, minPlayers: "100" }).success,
    ).toBe(false);
    expect(
      updateGameFactsInput.safeParse({ ...blank, playTimeMin: "1441" }).success,
    ).toBe(false);
  });

  it("rejects a maximum below the minimum, on the maximum field", () => {
    const result = updateGameFactsInput.safeParse({
      ...blank,
      minPlayers: "4",
      maxPlayers: "2",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["maxPlayers"]);
    }
  });

  it("rejects a description over the limit and a bad game id", () => {
    expect(
      updateGameFactsInput.safeParse({
        ...blank,
        description: "x".repeat(2001),
      }).success,
    ).toBe(false);
    expect(
      updateGameFactsInput.safeParse({ ...blank, gameId: "not-a-uuid" })
        .success,
    ).toBe(false);
  });
});

describe("updateGameFactsInput messages", () => {
  const messages = (input: Record<string, string>) => {
    const result = updateGameFactsInput.safeParse({ ...blank, ...input });
    if (result.success) return {};
    return Object.fromEntries(
      result.error.issues.map((issue) => [issue.path[0], issue.message]),
    );
  };

  it("says what is wrong with each number field, not just 'Invalid input'", () => {
    expect(messages({ year: "abc" })).toEqual({
      year: "Year must be a whole number.",
    });
    expect(messages({ year: "0" })).toEqual({
      year: "Year must be at least 1.",
    });
    expect(messages({ year: "2201" })).toEqual({
      year: "Year must be 2200 or less.",
    });
    expect(messages({ minPlayers: "100" })).toEqual({
      minPlayers: "Minimum players must be 99 or less.",
    });
  });

  it("reports every bad field at once", () => {
    expect(messages({ year: "abc", playTimeMin: "x" })).toEqual({
      year: "Year must be a whole number.",
      playTimeMin: "Play time must be a whole number.",
    });
  });
});
