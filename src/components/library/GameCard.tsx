import Link from "next/link";
import { FallbackCover } from "@/components/game/FallbackCover";
import { coverUrl } from "@/features/catalogue/cover";
import { STATUS_LABELS, type LibraryItem } from "@/features/collection/schemas";

const tile =
  "shadow-soft group-hover:shadow-lift duration-base transition-shadow";

/**
 * A game in the Library. With a cover, the picture is the tile and the title sits under it in
 * one line, so a long list can be scanned. Without one, the tile carries the title itself.
 * Either way the status (when named) sits under the tile, so rows keep one rhythm.
 * Owned is the quiet default: only other statuses are named, unless `alwaysShowStatus` is set.
 */
export function GameCard({
  item,
  alwaysShowStatus = false,
}: {
  item: LibraryItem;
  /** Name the status even for Owned, for example when several statuses are listed together. */
  alwaysShowStatus?: boolean;
}) {
  const status =
    alwaysShowStatus || item.status !== "owned"
      ? STATUS_LABELS[item.status]
      : null;
  return (
    <li>
      <Link
        href={`/games/${item.gameId}`}
        className="group rounded-cover focus-visible:outline-bronze block focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {item.cover ? (
          <>
            <div
              className={`${tile} bg-cream rounded-cover aspect-3/4 overflow-hidden`}
            >
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
            </div>
            <h2
              className="mt-3 truncate text-sm font-medium"
              title={item.title}
            >
              {item.title}
            </h2>
            {status ? (
              <p className="text-ink-soft truncate text-sm">{status}</p>
            ) : null}
          </>
        ) : (
          <>
            <FallbackCover className={tile}>
              <h2 className="font-display line-clamp-5 text-lg break-words">
                {item.title}
              </h2>
            </FallbackCover>
            {status ? (
              <p className="text-ink-soft mt-3 truncate text-sm">{status}</p>
            ) : null}
          </>
        )}
      </Link>
    </li>
  );
}
