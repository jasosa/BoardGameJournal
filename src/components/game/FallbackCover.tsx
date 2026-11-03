import type { ReactNode } from "react";

/**
 * The stand-in for a missing cover: a raised tile (3:4) with a soft light from the top corner and
 * the game's initial in the middle. The title is never repeated here; it sits in the caption
 * (Library) or next to the tile (game page).
 */
export function FallbackCover({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-raised rounded-cover shadow-soft aspect-3/4 flex items-center justify-center bg-linear-to-br from-ink/10 to-transparent ${className}`}
    >
      {children}
    </div>
  );
}
