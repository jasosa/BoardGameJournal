import { describe, expect, it } from "vitest";
import { formatFacts } from "./facts";

const none = {
  year: null,
  minPlayers: null,
  maxPlayers: null,
  playTimeMin: null,
};

describe("formatFacts", () => {
  it("joins every known fact", () => {
    expect(
      formatFacts({
        year: 2019,
        minPlayers: 1,
        maxPlayers: 5,
        playTimeMin: 60,
      }),
    ).toBe("1-5 players · 60 min · 2019");
  });

  it("returns null when nothing is known", () => {
    expect(formatFacts(none)).toBeNull();
  });

  it("skips unknown parts", () => {
    expect(formatFacts({ ...none, year: 2019 })).toBe("2019");
    expect(formatFacts({ ...none, playTimeMin: 45 })).toBe("45 min");
  });

  it("uses singular and a single number when min equals max", () => {
    expect(formatFacts({ ...none, minPlayers: 1, maxPlayers: 1 })).toBe(
      "1 player",
    );
    expect(formatFacts({ ...none, minPlayers: 4, maxPlayers: 4 })).toBe(
      "4 players",
    );
  });

  it("copes with only one end of the player range", () => {
    expect(formatFacts({ ...none, minPlayers: 2 })).toBe("2 players");
    expect(formatFacts({ ...none, maxPlayers: 4 })).toBe("4 players");
  });
});
