import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The import block calls a server action, which cannot load outside Next.
vi.mock("@/app/(app)/settings/data-actions", () => ({
  importAccountAction: vi.fn(),
}));

import { DataSection, DataSectionSkeleton } from "./DataSection";
import { ExportBlock } from "./ExportBlock";
import { ImportBlock } from "./ImportBlock";

/** A client whose queries answer with a count, or fail. */
function client(result: { count: number | null; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  for (const name of ["select", "eq", "not", "order"]) builder[name] = chain;
  builder.then = (resolve: (value: unknown) => void) => resolve(result);
  return { from: () => builder } as never;
}

const counts = {
  games: 214,
  copies: 231,
  archived: 9,
  changes: 412,
  ratings: 37,
  thoughts: 52,
};

describe("Your data states", () => {
  it("the loading skeleton is busy, named, and has no controls", () => {
    const html = renderToStaticMarkup(<DataSectionSkeleton />);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(">Your data<");
    expect(html).toContain("Loading a summary of your data");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<input");
  });

  it("a failed load shows an alert and a way to try again, and no export or import", async () => {
    const element = await DataSection({
      supabase: client({ count: null, error: { message: "down" } }),
      userId: "u1",
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('role="alert"');
    expect(html).toContain(
      "Could not read your data just now, so export and import are not available.",
    );
    expect(html).toContain('href="/settings"');
    expect(html).not.toContain("Download export");
    expect(html).not.toContain("Choose a file");
  });

  it("an account with data shows the counts, the closed disclosure and the download button", () => {
    const html = renderToStaticMarkup(
      <ExportBlock counts={counts} empty={false} />,
    );
    expect(html).toContain("214 games");
    expect(html).toContain("231 copies (9 archived)");
    expect(html).toContain("What is in the file");
    expect(html).not.toContain("<details open");
    expect(html).toContain("Download export");
    expect(html).toContain(
      "Download a copy of everything you have recorded, as one JSON file.",
    );
  });

  it("an empty account has the one sentence and no button", () => {
    const html = renderToStaticMarkup(
      <ExportBlock
        counts={{ ...counts, games: 0, copies: 0, ratings: 0, thoughts: 0 }}
        empty
      />,
    );
    expect(html).toContain("Nothing to export yet.");
    expect(html).not.toContain("Download export");
    expect(html).not.toContain("What is in the file");
  });

  it("import is not available when the account has data, with no file control", () => {
    const html = renderToStaticMarkup(<ImportBlock empty={false} />);
    expect(html).toContain("Put an export back into this account.");
    expect(html).toContain("so import is not available here");
    expect(html).not.toContain('type="file"');
  });

  it("an empty account gets a real, labelled file input with the hint", () => {
    const html = renderToStaticMarkup(<ImportBlock empty />);
    expect(html).toContain('type="file"');
    expect(html).toContain('accept=".json,application/json"');
    expect(html).toContain('aria-describedby="import-file-hint"');
    expect(html).toContain(">Choose a file<");
    expect(html).toContain("A .json file made by Export, up to 10 MB.");
    expect(html).not.toContain("so import is not available here");
  });
});
