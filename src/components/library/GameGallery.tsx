import type { LibraryItem } from "@/features/collection/schemas";
import { GameCard } from "./GameCard";

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
      className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-5"
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
