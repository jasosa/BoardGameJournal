import { STATUS_LABELS, type LibraryItem } from "@/features/collection/schemas";

/** Cover-shaped tile. Falls back to the title in display type until a cover exists. */
export function GameCard({ item }: { item: LibraryItem }) {
  return (
    <li>
      <article className="bg-cream rounded-cover shadow-soft flex aspect-3/4 flex-col justify-between p-4">
        <h2 className="font-display line-clamp-5 text-lg break-words">
          {item.title}
        </h2>
        {item.status !== "owned" ? (
          <p className="text-ink-soft text-sm">{STATUS_LABELS[item.status]}</p>
        ) : null}
      </article>
    </li>
  );
}
