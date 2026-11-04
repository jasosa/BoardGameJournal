/**
 * A small, safe reader for the light Markdown of a thought (ADR-0005): paragraphs, line breaks,
 * **bold**, *italics*, bulleted and numbered lists, and [links](https://...). It returns a tree,
 * never HTML, so the screen renders every piece of text as plain text and nothing can inject
 * markup. Only http and https links are kept.
 */
export type Inline =
  | { type: "text"; value: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "link"; href: string; text: string }
  | { type: "break" };

export type Block =
  | { type: "paragraph"; children: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] };

/** A link at a given position (sticky), so the text is never copied. */
const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/y;

function pushText(out: Inline[], value: string) {
  if (value === "") return;
  const last = out[out.length - 1];
  if (last?.type === "text") last.value += value;
  else out.push({ type: "text", value });
}

const SPACE = /\s/;
const WORD = /[\p{L}\p{N}]/u;
const isWord = (char: string | undefined) =>
  char !== undefined && WORD.test(char);

/** Inline parsing, with bold and italics nested at most two levels deep. */
export function parseInline(source: string, depth = 0): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i]!;
    if (char === "\n") {
      out.push({ type: "break" });
      i += 1;
      continue;
    }
    if (char === "*" && source.startsWith("**", i)) {
      const end = source.indexOf("**", i + 2);
      if (end > i + 2 && depth < 2) {
        out.push({
          type: "strong",
          children: parseInline(source.slice(i + 2, end), depth + 1),
        });
        i = end + 2;
        continue;
      }
    }
    if (char === "*" && !source.startsWith("**", i)) {
      const end = source.indexOf("*", i + 1);
      // An emphasis needs text right after the opening star and before the closing one.
      if (
        end > i + 1 &&
        !SPACE.test(source[i + 1] ?? "") &&
        !SPACE.test(source[end - 1] ?? "") &&
        depth < 2
      ) {
        out.push({
          type: "em",
          children: parseInline(source.slice(i + 1, end), depth + 1),
        });
        i = end + 1;
        continue;
      }
    }
    if (char === "_" && !isWord(source[i - 1]) && depth < 2) {
      // _italics_ only at the edge of a word, so snake_case_names are left alone.
      const end = source.indexOf("_", i + 1);
      if (
        end > i + 1 &&
        !SPACE.test(source[i + 1] ?? "") &&
        !SPACE.test(source[end - 1] ?? "") &&
        !isWord(source[end + 1])
      ) {
        out.push({
          type: "em",
          children: parseInline(source.slice(i + 1, end), depth + 1),
        });
        i = end + 1;
        continue;
      }
    }
    if (char === "[") {
      LINK.lastIndex = i;
      const match = LINK.exec(source);
      if (match) {
        out.push({ type: "link", text: match[1]!, href: match[2]! });
        i += match[0].length;
        continue;
      }
    }
    pushText(out, char);
    i += 1;
  }
  return out;
}

const BULLET = /^\s{0,3}[-*]\s+(.*)$/;
const NUMBER = /^\s{0,3}\d{1,3}[.)]\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({
        type: "paragraph",
        children: parseInline(paragraph.join("\n")),
      });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({
        type: "list",
        ordered: list.ordered,
        items: list.items.map((item) => parseInline(item)),
      });
      list = null;
    }
  };

  for (const line of lines) {
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }
    const bullet = BULLET.exec(line);
    const number = bullet ? null : NUMBER.exec(line);
    const item = bullet ?? number;
    if (item) {
      flushParagraph();
      const ordered = number !== null;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push(item[1] ?? "");
      continue;
    }
    flushList();
    paragraph.push(line.trimEnd());
  }
  flushParagraph();
  flushList();
  return blocks;
}
