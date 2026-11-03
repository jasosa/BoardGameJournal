import type { ReactNode } from "react";

/**
 * The stand-in for a missing cover: a cream tile with a hairline frame inset like the border
 * of a book cover. The content (a title, an initial) is centred inside the frame.
 */
export function FallbackCover({
  children,
  footer,
  className = "",
}: {
  children: ReactNode;
  /** Small text at the bottom of the frame, such as the status. */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-cream rounded-cover shadow-soft aspect-3/4 relative ${className}`}
    >
      <div className="border-ink-faint/50 rounded-cover absolute inset-2 flex flex-col items-center justify-center border px-3 text-center">
        {children}
        {footer ? (
          <div className="text-ink-soft absolute inset-x-2 bottom-3 text-sm">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
