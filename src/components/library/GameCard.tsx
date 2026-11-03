import Link from "next/link";
import { FallbackCover } from "@/components/game/FallbackCover";
import { coverUrl } from "@/features/catalogue/cover";
import { STATUS_LABELS, type LibraryItem } from "@/features/collection/schemas";

const tile =
  "shadow-soft group-hover:shadow-lift duration-base transition-shadow";

/** One quiet line under a tile: the status (with a small square) or, for Owned, the year. */
function CardMeta({
  year,
  status,
}: {
  year: number | null;
  status: string | null;
}) {
  if (!status && year === null) return null;
  return (
    <p className="text-ink-soft mt-1 flex items-center gap-2 truncate text-sm">
      {status ? (
        <>
          <span aria-hidden="true" className="bg-ink size-2 shrink-0" />
          {status}
        </>
      ) : (
        year
      )}
    </p>
  );
}

/**
 * A game on the wall. With a cover, the picture is the tile and the title sits under it in
 * one line, like a museum label. Without one, the tile carries the title itself. Either way the
 * status (when named) sits under the tile, so rows keep one rhythm. Owned is the quiet default:
 * only other statuses are named, unless `alwaysShowStatus` is set.
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
              className="mt-2 truncate text-sm font-semibold"
              title={item.title}
            >
              {item.title}
            </h2>
            <CardMeta year={item.year} status={status} />
          </>
        ) : (
          <>
            <FallbackCover className={tile}>
              <h2 className="font-display line-clamp-5 text-lg font-semibold break-words">
                {item.title}
              </h2>
            </FallbackCover>
            <CardMeta year={null} status={status} />
          </>
        )}
      </Link>
    </li>
  );
}
