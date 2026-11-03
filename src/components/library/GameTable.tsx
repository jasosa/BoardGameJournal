import Link from "next/link";
import { formatPlayers } from "@/features/catalogue/facts";
import { coverUrl } from "@/features/catalogue/cover";
import { STATUS_LABELS, type LibraryItem } from "@/features/collection/schemas";

const head = "text-ink-soft py-2 pr-4 text-left text-sm font-medium";
const cell = "border-line border-t py-1 pr-4 align-middle text-sm";
const extra = "hidden sm:table-cell";

/**
 * Games as rows. The title (with a small cover) is the row's link; on a phone only Title and
 * Status show. Owned is the quiet default, named only for screen readers.
 */
export function GameTable({ items }: { items: LibraryItem[] }) {
  return (
    <table aria-label="Your games" className="w-full border-collapse">
      <thead>
        <tr>
          <th scope="col" className={head}>
            Title
          </th>
          <th scope="col" className={head}>
            Status
          </th>
          <th scope="col" className={`${head} ${extra}`}>
            Players
          </th>
          <th scope="col" className={`${head} ${extra}`}>
            Time
          </th>
          <th scope="col" className={`${head} ${extra}`}>
            Year
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.entryId}>
            <th scope="row" className={`${cell} text-left font-normal`}>
              <Link
                href={`/games/${item.gameId}`}
                className="text-ink focus-visible:outline-accent inline-flex min-h-11 items-center gap-3 py-1 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span className="bg-raised rounded-cover aspect-3/4 w-10 shrink-0 overflow-hidden">
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
                  ) : null}
                </span>
                {item.title}
              </Link>
            </th>
            <td className={cell}>
              {item.status === "owned" ? (
                <span className="sr-only">{STATUS_LABELS.owned}</span>
              ) : (
                <span className="text-ink-soft">
                  {STATUS_LABELS[item.status]}
                </span>
              )}
            </td>
            <td className={`${cell} ${extra}`}>
              {formatPlayers(item.minPlayers, item.maxPlayers)}
            </td>
            <td className={`${cell} ${extra}`}>
              {item.playTimeMin === null ? null : `${item.playTimeMin} min`}
            </td>
            <td className={`${cell} ${extra}`}>{item.year}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
