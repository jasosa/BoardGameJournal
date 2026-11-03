import Link from "next/link";
import type { CSSProperties } from "react";
import { FallbackCover } from "@/components/game/FallbackCover";
import { coverUrl } from "@/features/catalogue/cover";
import { isHexColour } from "@/features/catalogue/cover-colours";
import { STATUS_LABELS, type LibraryItem } from "@/features/collection/schemas";

const tile = "shadow-soft duration-base transition-[transform,box-shadow]";

/**
 * A game on the wall. The cover keeps its own shape (3:4 with the initial when there is none) and
 * the title sits under it like a museum label: title on the left, year on the right. The status, when named, is a small square in the cover's own colour plus
 * its name. Owned is the quiet default: only other statuses are named, unless
 * `alwaysShowStatus` is set.
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
  const accent = isHexColour(item.accent) ? item.accent : null;
  const ratio =
    item.coverWidth && item.coverHeight
      ? item.coverWidth / item.coverHeight
      : 3 / 4;
  const marker = status ? (
    <p className="text-ink-soft mt-1 flex items-center gap-2 truncate text-xs font-semibold tracking-wider uppercase">
      <span
        aria-hidden="true"
        className="bg-ink size-2 shrink-0"
        style={accent ? { backgroundColor: accent } : undefined}
      />
      {status}
    </p>
  ) : null;

  return (
    <li className="mb-5 break-inside-avoid">
      <Link
        href={`/games/${item.gameId}`}
        style={
          { "--tile-accent": accent ?? "var(--color-ink)" } as CSSProperties
        }
        className="group rounded-cover focus-visible:outline-bronze block focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {item.cover ? (
          <div
            style={{ aspectRatio: ratio }}
            className={`${tile} bg-cream rounded-cover overflow-hidden group-hover:-translate-y-1.5 group-hover:ring-2 group-hover:ring-(--tile-accent)`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- private image from our own route; next/image cannot send the session cookie */}
            <img
              src={coverUrl(item.cover, "thumb")}
              alt=""
              width={item.coverWidth ?? 360}
              height={item.coverHeight ?? 480}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          </div>
        ) : (
          <FallbackCover
            className={`${tile} group-hover:-translate-y-1.5 group-hover:ring-2 group-hover:ring-(--tile-accent)`}
          >
            <span
              aria-hidden="true"
              className="font-display text-ink-soft text-5xl font-bold"
            >
              {item.title.trim().charAt(0).toUpperCase()}
            </span>
          </FallbackCover>
        )}
        <div className="mt-2 flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="truncate text-sm font-semibold" title={item.title}>
            {item.title}
          </h2>
          {item.year ? (
            <span className="text-ink-soft shrink-0 text-sm">{item.year}</span>
          ) : null}
        </div>
        {marker}
      </Link>
    </li>
  );
}
