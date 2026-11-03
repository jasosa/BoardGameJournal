import Link from "next/link";
import { coverUrl } from "@/features/catalogue/cover";
import { STATUS_LABELS, type LibraryItem } from "@/features/collection/schemas";

/** Three spine heights, picked from the title so a game keeps its height between visits. */
const HEIGHTS = ["h-44 md:h-52", "h-48 md:h-56", "h-52 md:h-60"] as const;

function spineHeight(title: string): string {
  let sum = 0;
  for (const char of title) sum += char.codePointAt(0) ?? 0;
  return HEIGHTS[sum % HEIGHTS.length] ?? HEIGHTS[0];
}

const common =
  "border-line hover:border-bronze rounded-cover duration-fast focus-visible:outline-bronze relative block overflow-hidden border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * Games standing on a shelf, bottom-aligned. A game with a cover stands face out (a small
 * cover); the others show their title down the spine. Each one is a link named with the title.
 */
export function GameShelf({ items }: { items: LibraryItem[] }) {
  return (
    <ul aria-label="Your games" className="flex flex-wrap items-end gap-3">
      {items.map((item) => {
        const status =
          item.status === "owned" ? "" : STATUS_LABELS[item.status];
        return (
          <li key={item.entryId}>
            <Link
              href={`/games/${item.gameId}`}
              title={status ? `${item.title} (${status})` : item.title}
              className={
                item.cover
                  ? `${common} bg-cream shadow-soft aspect-3/4 h-48 md:h-56`
                  : `${common} bg-cream w-12 md:w-14 ${spineHeight(item.title)}`
              }
            >
              {item.cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- private image from our own route; next/image cannot send the session cookie
                <img
                  src={coverUrl(item.cover, "thumb")}
                  alt=""
                  width={360}
                  height={480}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              ) : (
                <span className="font-display spine-title flex h-full items-center justify-center px-1 py-3">
                  <span className="max-h-full overflow-hidden text-sm text-ellipsis whitespace-nowrap md:text-base">
                    {item.title}
                  </span>
                </span>
              )}
              <span className="sr-only">
                {item.cover ? item.title : ""}
                {status ? `, ${status}` : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
