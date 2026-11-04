import { describe, expect, it } from "vitest";
import {
  filterThoughts,
  showMoreLabel,
  sortNewestFirst,
  topicCounts,
  topicsLine,
  visibleTabs,
} from "./list";
import { parseInline, parseMarkdown } from "./markdown";
import {
  THOUGHT_MAX_LENGTH,
  acceptableWrittenOn,
  addThoughtInput,
  characterCount,
  updateThoughtInput,
  type Thought,
} from "./schemas";
import { normalizeTopics } from "./topics";

const GAME = "00000000-0000-4000-8000-000000000001";

function thought(
  id: string,
  writtenOn: string,
  topics: Thought["topics"] = [],
  createdAt = `${writtenOn}T10:00:00Z`,
): Thought {
  return { id, gameId: GAME, body: id, topics, writtenOn, createdAt };
}

describe("addThoughtInput", () => {
  const parse = (patch: Record<string, unknown>) =>
    addThoughtInput.safeParse({ gameId: GAME, body: "Nice.", ...patch });

  it("trims the text and refuses an empty one", () => {
    const ok = parse({ body: "  Nice game.  " });
    expect(ok.success && ok.data.body).toBe("Nice game.");
    for (const body of ["", "   ", "\n\n"]) {
      const bad = parse({ body });
      expect(bad.success).toBe(false);
      if (!bad.success) {
        expect(bad.error.issues[0]?.message).toBe(
          "Write something before you save.",
        );
      }
    }
    expect(addThoughtInput.safeParse({ gameId: GAME }).success).toBe(false);
  });

  it("limits the text to 10,000 characters, counting code points", () => {
    expect(parse({ body: "x".repeat(THOUGHT_MAX_LENGTH) }).success).toBe(true);
    const over = parse({ body: "x".repeat(THOUGHT_MAX_LENGTH + 1) });
    expect(over.success).toBe(false);
    if (!over.success) {
      expect(over.error.issues[0]?.message).toBe(
        "This thought is too long. Keep it to 10,000 characters.",
      );
    }
    // Emoji are one character each, as the database counts them.
    expect(characterCount("a😀b")).toBe(3);
    expect(parse({ body: "😀".repeat(THOUGHT_MAX_LENGTH) }).success).toBe(true);
  });

  it("keeps known topics in screen order, once each, and refuses unknown ones", () => {
    const ok = parse({ topics: ["combat", "theme", "theme", "mechanics"] });
    expect(ok.success && ok.data.topics).toEqual([
      "mechanics",
      "theme",
      "combat",
    ]);
    expect(parse({}).success && parse({}).data?.topics).toEqual([]);
    expect(parse({ topics: ["humour"] }).success).toBe(false);
    expect(parse({ topics: ["Theme"] }).success).toBe(false);
  });

  it("treats a blank date as not given and checks a given one", () => {
    const blank = parse({ writtenOn: "" });
    expect(blank.success && blank.data.writtenOn).toBeUndefined();
    expect(parse({ writtenOn: "2999-01-01" }).success).toBe(false);
    expect(parse({ writtenOn: "2024-05-01" }).success).toBe(true);
    expect(parse({ gameId: "nope" }).success).toBe(false);
  });
});

describe("acceptableWrittenOn", () => {
  const now = new Date("2026-11-04T12:00:00Z");

  it("keeps the person's date within a day of the server's today", () => {
    expect(acceptableWrittenOn("2026-11-04", now)).toBe("2026-11-04");
    expect(acceptableWrittenOn("2026-11-03", now)).toBe("2026-11-03");
    expect(acceptableWrittenOn("2026-11-05", now)).toBe("2026-11-05");
  });

  it("turns a backdated, far, future or broken date into today", () => {
    for (const value of [
      "2024-01-01",
      "2026-11-02",
      "2026-11-07",
      "2999-01-01",
      "",
      "nope",
      "2026-13-40",
    ]) {
      expect(acceptableWrittenOn(value, now), value).toBe("2026-11-04");
    }
  });
});

describe("updateThoughtInput", () => {
  it("has the same text and topic rules, and needs a real id", () => {
    const base = { thoughtId: GAME, body: "Changed", topics: ["artwork"] };
    expect(updateThoughtInput.safeParse(base).success).toBe(true);
    expect(updateThoughtInput.safeParse({ ...base, body: " " }).success).toBe(
      false,
    );
    expect(
      updateThoughtInput.safeParse({ ...base, topics: ["nope"] }).success,
    ).toBe(false);
    expect(
      updateThoughtInput.safeParse({ ...base, thoughtId: "x" }).success,
    ).toBe(false);
  });
});

describe("normalizeTopics", () => {
  it("orders, de-duplicates and drops unknown values", () => {
    expect(normalizeTopics(["combat", "zzz", "theme", "combat"])).toEqual([
      "theme",
      "combat",
    ]);
  });
});

describe("list rules", () => {
  const list = [
    thought("a", "2026-10-01", ["mechanics", "artwork"]),
    thought("b", "2026-11-02", ["artwork"]),
    thought("c", "2026-11-02", [], "2026-11-02T12:00:00Z"),
    thought("d", "2026-09-01", ["theme"]),
  ];

  it("sorts newest first, then the one saved last, without changing the input", () => {
    expect(sortNewestFirst(list).map((t) => t.id)).toEqual([
      "c",
      "b",
      "a",
      "d",
    ]);
    expect(list.map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("counts topics", () => {
    const counts = topicCounts(list);
    expect(counts.artwork).toBe(2);
    expect(counts.mechanics).toBe(1);
    expect(counts.combat).toBe(0);
  });

  it("shows All and only the topics that have thoughts, in screen order", () => {
    const tabs = visibleTabs(list, "all");
    expect(tabs.map((t) => t.label)).toEqual([
      "All",
      "Mechanics",
      "Theme",
      "Artwork",
    ]);
    expect(tabs.map((t) => t.count)).toEqual([4, 1, 1, 2]);
    expect(tabs[0]!.name).toBe("All, 4 thoughts");
    expect(tabs[1]!.name).toBe("Mechanics, 1 thought");
  });

  it("has no tabs when no thought has a topic", () => {
    expect(visibleTabs([thought("x", "2026-01-01")], "all")).toEqual([]);
    expect(visibleTabs([], "all")).toEqual([]);
  });

  it("keeps the selected topic with 0 until another tab is chosen", () => {
    const tabs = visibleTabs([thought("x", "2026-01-01", ["theme"])], "combat");
    expect(tabs.map((t) => [t.label, t.count])).toEqual([
      ["All", 1],
      ["Theme", 1],
      ["Combat", 0],
    ]);
  });

  it("filters by topic and builds the topics line", () => {
    expect(filterThoughts(list, "artwork").map((t) => t.id)).toEqual([
      "a",
      "b",
    ]);
    expect(filterThoughts(list, "all")).toHaveLength(4);
    expect(topicsLine(list[0]!, "all")).toEqual({
      prefix: "",
      text: "mechanics · artwork",
    });
    expect(topicsLine(list[0]!, "artwork")).toEqual({
      prefix: "also: ",
      text: "mechanics",
    });
    expect(topicsLine(list[1]!, "artwork")).toBeNull();
    expect(topicsLine(list[2]!, "all")).toBeNull();
  });

  it("labels Show more by steps of ten", () => {
    expect(showMoreLabel(34, 10)).toBe("Show 10 more");
    expect(showMoreLabel(34, 30)).toBe("Show 4 more");
    expect(showMoreLabel(10, 10)).toBeNull();
    expect(showMoreLabel(3, 3)).toBeNull();
  });
});

describe("light Markdown", () => {
  it("makes paragraphs and keeps single line breaks", () => {
    expect(parseMarkdown("One\nTwo\n\nThree")).toEqual([
      {
        type: "paragraph",
        children: [
          { type: "text", value: "One" },
          { type: "break" },
          { type: "text", value: "Two" },
        ],
      },
      { type: "paragraph", children: [{ type: "text", value: "Three" }] },
    ]);
  });

  it("reads bold, italics and links", () => {
    expect(parseInline("a **b** *c* [d](https://e.com/x?y=1) f")).toEqual([
      { type: "text", value: "a " },
      { type: "strong", children: [{ type: "text", value: "b" }] },
      { type: "text", value: " " },
      { type: "em", children: [{ type: "text", value: "c" }] },
      { type: "text", value: " " },
      { type: "link", text: "d", href: "https://e.com/x?y=1" },
      { type: "text", value: " f" },
    ]);
  });

  it("keeps only http and https links, and never builds markup", () => {
    for (const bad of [
      "[x](javascript:alert(1))",
      "[x](data:text/html,<b>)",
      "[x](//evil.com)",
    ]) {
      const inline = parseInline(bad);
      expect(inline.some((part) => part.type === "link")).toBe(false);
    }
    const html = parseInline("<script>alert(1)</script><b>x</b>");
    expect(html).toEqual([
      { type: "text", value: "<script>alert(1)</script><b>x</b>" },
    ]);
  });

  it("reads _italics_ at the edge of a word, and leaves snake_case alone", () => {
    expect(parseInline("a _b_ c")).toEqual([
      { type: "text", value: "a " },
      { type: "em", children: [{ type: "text", value: "b" }] },
      { type: "text", value: " c" },
    ]);
    expect(parseInline("_start_ and end_")).toEqual([
      { type: "em", children: [{ type: "text", value: "start" }] },
      { type: "text", value: " and end_" },
    ]);
    for (const plain of ["snake_case_name", "a _ b _ c", "_open", "x_y_ z"]) {
      expect(parseInline(plain), plain).toEqual([
        { type: "text", value: plain },
      ]);
    }
  });

  it("leaves stray stars and spaced stars alone", () => {
    expect(parseInline("2 * 3 * 4")).toEqual([
      { type: "text", value: "2 * 3 * 4" },
    ]);
    expect(parseInline("one * two")).toEqual([
      { type: "text", value: "one * two" },
    ]);
    expect(parseInline("**open")).toEqual([{ type: "text", value: "**open" }]);
  });

  it("reads bulleted and numbered lists", () => {
    const blocks = parseMarkdown("Intro\n- one\n- two\n\n1. first\n2. second");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "list", "list"]);
    expect(blocks[1]).toMatchObject({ ordered: false });
    expect(blocks[2]).toMatchObject({ ordered: true });
    const first = blocks[1];
    expect(first?.type === "list" ? first.items : []).toHaveLength(2);
  });

  it("handles empty text and Windows line endings", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("a\r\n\r\nb")).toHaveLength(2);
  });
});
