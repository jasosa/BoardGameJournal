"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  parseMarkdown,
  type Block,
  type Inline,
} from "@/features/thoughts/markdown";

function renderInline(parts: Inline[]): React.ReactNode {
  return parts.map((part, index) => {
    switch (part.type) {
      case "text":
        return part.value;
      case "break":
        return <br key={index} />;
      case "strong":
        return <strong key={index}>{renderInline(part.children)}</strong>;
      case "em":
        return <em key={index}>{renderInline(part.children)}</em>;
      case "link":
        return (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            {part.text}
          </a>
        );
    }
  });
}

function renderBlock(block: Block, index: number): React.ReactNode {
  if (block.type === "paragraph") {
    return (
      <p key={index} className="mb-2.5 last:mb-0">
        {renderInline(block.children)}
      </p>
    );
  }
  const List = block.ordered ? "ol" : "ul";
  return (
    <List
      key={index}
      className={`mb-2.5 pl-5 last:mb-0 ${block.ordered ? "list-decimal" : "list-disc"}`}
    >
      {block.items.map((item, itemIndex) => (
        <li key={itemIndex}>{renderInline(item)}</li>
      ))}
    </List>
  );
}

/**
 * The text of a thought as light Markdown: paragraphs, line breaks, bold, italics, lists and
 * links. Every piece is rendered as text, never as HTML. Over six lines it is cut with an
 * ellipsis while `clamped`; `onOverflowChange` tells the row whether there is more to show.
 */
export function ThoughtText({
  id,
  body,
  clamped,
  onOverflowChange,
}: {
  id: string;
  body: string;
  clamped: boolean;
  onOverflowChange: (overflowing: boolean) => void;
}) {
  const blocks = useMemo(() => parseMarkdown(body), [body]);
  const element = useRef<HTMLDivElement>(null);

  // Measured while clamped, and again when the width changes. The observer also fires once when
  // it starts, which gives the first measurement.
  useEffect(() => {
    const node = element.current;
    if (!node || !clamped || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      onOverflowChange(node.scrollHeight > node.clientHeight + 1);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [clamped, body, onOverflowChange]);

  return (
    <div
      ref={element}
      id={id}
      className={`max-w-prose break-words text-base ${
        clamped ? "line-clamp-6" : ""
      }`}
    >
      {blocks.map(renderBlock)}
    </div>
  );
}
