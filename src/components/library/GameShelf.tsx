import Link from "next/link";
import { coverUrl } from "@/features/catalogue/cover";
import { STATUS_LABELS, type LibraryItem } from "@/features/collection/schemas";

const spine =
  "bg-cream border-line hover:border-bronze rounded-cover duration-fast relative flex h-48 w-12 items-center justify-center overflow-hidden border transition-colors md:h-56 md:w-14";

/**
 * Games as spines on a shelf. A game with a cover shows its cover as the spine; the others
 * show the title down the spine. Each spine is a link named with the title.
 */
export function GameShelf({ items }: { items: LibraryItem[] }) {
  return (
    <ul aria-label="Your games" className="flex flex-wrap items-end gap-2">
      {items.map((item) => {
        const status =
          item.status === "owned" ? "" : STATUS_LABELS[item.status];
        return (
          <li key={item.entryId}>
            <Link
              href={`/games/${item.gameId}`}
              title={status ? `${item.title} (${status})` : item.title}
              className={spine}
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
                <span className="font-display writing-vertical block h-full max-h-full overflow-hidden px-1 py-3 text-sm text-ellipsis whitespace-nowrap md:text-base">
                  {item.title}
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
