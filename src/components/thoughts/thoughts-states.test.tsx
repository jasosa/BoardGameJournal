import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThoughtsSection, ThoughtsSkeleton } from "./ThoughtsSection";

/** A client whose query fails, as when the database is down. */
function failingClient() {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  for (const name of ["select", "eq", "order", "limit"]) builder[name] = chain;
  builder.then = (resolve: (value: unknown) => void) =>
    resolve({ data: null, error: { message: "down" } });
  return { from: () => builder } as never;
}

describe("Thoughts loading and error states", () => {
  it("the loading skeleton is busy, named, has no link, and tells screen readers", () => {
    const html = renderToStaticMarkup(<ThoughtsSkeleton />);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(">Thoughts<");
    expect(html).toContain("Loading your thoughts");
    expect(html).not.toContain("Add thought");
    expect(html).not.toContain("<button");
  });

  it("a failed load shows an alert with a way to try again, and no composer or list", async () => {
    const element = await ThoughtsSection({
      supabase: failingClient(),
      userId: "u1",
      gameId: "00000000-0000-4000-8000-000000000001",
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not load your thoughts.");
    expect(html).toContain("Try again");
    expect(html).toContain(
      'href="/games/00000000-0000-4000-8000-000000000001"',
    );
    expect(html).not.toContain("Add thought");
    expect(html).not.toContain("<article");
  });
});
