import { coverUrl, type CoverRef } from "@/features/catalogue/cover";

/**
 * The game's cover, or a cream tile with the title's first letter until there is one.
 * The picture is already stored at the right size, so a plain image is enough.
 */
export function CoverTile({
  title,
  cover,
}: {
  title: string;
  cover?: CoverRef | null;
}) {
  const frame =
    "bg-cream rounded-cover shadow-soft aspect-3/4 w-24 shrink-0 overflow-hidden md:w-48";
  if (cover) {
    return (
      <div className={frame}>
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
    <div
      aria-hidden="true"
      className={`${frame} font-display text-ink-soft flex items-center justify-center text-4xl`}
    >
      {title.trim().charAt(0).toUpperCase()}
    </div>
  );
}
