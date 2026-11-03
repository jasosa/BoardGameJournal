import { describe, expect, it } from "vitest";
import { normalizeTitle } from "./title";

describe("normalizeTitle", () => {
  it("ignores case, spacing and punctuation", () => {
    expect(normalizeTitle("  Wing span ")).toBe("wingspan");
    expect(normalizeTitle("WINGSPAN")).toBe("wingspan");
    expect(normalizeTitle("Ticket to Ride: Europe")).toBe(
      normalizeTitle("ticket-to-ride europe"),
    );
  });

  it("ignores accents", () => {
    expect(normalizeTitle("Carcassoñne")).toBe("carcassonne");
    expect(normalizeTitle("Pandémie")).toBe("pandemie");
  });

  it("keeps different games different", () => {
    expect(normalizeTitle("Catan")).not.toBe(
      normalizeTitle("Catan: Seafarers"),
    );
    expect(normalizeTitle("Azul")).not.toBe(normalizeTitle("Azul: Summer"));
  });

  it("keeps digits and non-latin letters", () => {
    expect(normalizeTitle("7 Wonders")).toBe("7wonders");
    expect(normalizeTitle("カタン")).not.toBe("");
  });

  it("gives an empty string when nothing is left", () => {
    expect(normalizeTitle("  !! ")).toBe("");
    expect(normalizeTitle("")).toBe("");
  });
});
