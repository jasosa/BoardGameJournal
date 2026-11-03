import type { LibraryItem } from "@/features/collection/schemas";
import { GameCard } from "./GameCard";

/**
 * The wall: covers keep their own proportions and flow into columns, like pictures hung side
 * by side. Reading and tab order follow the columns (top to bottom, then the next column).
 */
export function GameGallery({
  items,
  alwaysShowStatus = false,
}: {
  items: LibraryItem[];
  alwaysShowStatus?: boolean;
}) {
  return (
    <ul
      aria-label="Your games"
      className="columns-2 gap-x-3.5 md:columns-3 lg:columns-4 xl:columns-6"
    >
      {items.map((item) => (
        <GameCard
          key={item.entryId}
          item={item}
          alwaysShowStatus={alwaysShowStatus}
        />
      ))}
    </ul>
  );
}
