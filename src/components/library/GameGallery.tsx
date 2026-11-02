import type { LibraryItem } from "@/features/collection/schemas";
import { GameCard } from "./GameCard";

export function GameGallery({ items }: { items: LibraryItem[] }) {
  return (
    <ul
      aria-label="Your games"
      className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
    >
      {items.map((item) => (
        <GameCard key={item.entryId} item={item} />
      ))}
    </ul>
  );
}
