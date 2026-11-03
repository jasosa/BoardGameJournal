import { FallbackCover } from "@/components/game/FallbackCover";
import { coverUrl, type CoverRef } from "@/features/catalogue/cover";

/**
 * The game's cover, or a raised tile with the title's first letter until there
 * is one. The picture is already stored at the right size, so a plain image is enough. The
 * tile fills the width its parent gives it.
 */
export function CoverTile({
  title,
  cover,
}: {
  title: string;
  cover?: CoverRef | null;
}) {
  if (cover) {
    return (
      <div className="bg-raised rounded-cover shadow-soft aspect-3/4 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- private image from our own route; next/image cannot send the session cookie */}
        <img
          src={coverUrl(cover)}
          alt={`Cover of ${title}`}
          width={900}
          height={1200}
          decoding="async"
          className="size-full object-cover"
        />
      </div>
    );
  }
  return (
    <div aria-hidden="true">
      <FallbackCover>
        <span className="font-display text-ink-soft text-5xl">
          {title.trim().charAt(0).toUpperCase()}
        </span>
      </FallbackCover>
    </div>
  );
}
