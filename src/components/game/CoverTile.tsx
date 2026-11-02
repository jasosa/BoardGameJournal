/** Cover placeholder until real cover art exists: a cream tile with the title's first letter. */
export function CoverTile({ title }: { title: string }) {
  return (
    <div
      aria-hidden="true"
      className="bg-cream rounded-cover shadow-soft font-display text-ink-soft flex aspect-3/4 w-24 shrink-0 items-center justify-center text-4xl md:w-36"
    >
      {title.trim().charAt(0).toUpperCase()}
    </div>
  );
}
