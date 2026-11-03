import Link from "next/link";
import { coverUrl } from "@/features/catalogue/cover";
import { STATUS_LABELS, type LibraryItem } from "@/features/collection/schemas";

const tile =
  "rounded-cover shadow-soft hover:shadow-lift duration-base aspect-3/4 transition-shadow";

/**
 * A game in the Library. With a cover the picture fills the tile; the title stays as hidden
 * text so the link keeps its name. Without one it is a cream tile with the title in display type.
 */
export function GameCard({
  item,
  alwaysShowStatus = false,
}: {
  item: LibraryItem;
  /** Show the status even for Owned, for example when several statuses are listed together. */
  alwaysShowStatus?: boolean;
}) {
  const showStatus = alwaysShowStatus || item.status !== "owned";
  return (
    <li>
      <Link href={`/games/${item.gameId}`} className="rounded-cover block">
        {item.cover ? (
          <div className={`${tile} bg-cream relative overflow-hidden`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- private image from our own route; next/image cannot send the session cookie */}
            <img
              src={coverUrl(item.cover, "thumb")}
              alt=""
              width={360}
              height={480}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
            <h2 className="sr-only">{item.title}</h2>
            {showStatus ? (
              <p className="bg-paper text-ink rounded-input absolute bottom-2 left-2 px-2 py-1 text-xs">
                {STATUS_LABELS[item.status]}
              </p>
            ) : null}
          </div>
        ) : (
          <div className={`${tile} bg-cream flex flex-col justify-between p-4`}>
            <h2 className="font-display line-clamp-5 text-lg break-words">
              {item.title}
            </h2>
            {showStatus ? (
              <p className="text-ink-soft text-sm">
                {STATUS_LABELS[item.status]}
              </p>
            ) : null}
          </div>
        )}
      </Link>
    </li>
  );
}
