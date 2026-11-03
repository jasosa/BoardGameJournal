import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  aside,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  /** Small text on the right of the title, on the same baseline (for example a count). */
  aside?: ReactNode;
  /** Less space below, for pages where a toolbar follows. */
  compact?: boolean;
}) {
  return (
    <header className={compact ? "mb-5" : "mb-8"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        {aside ? <p className="text-ink-soft text-sm">{aside}</p> : null}
      </div>
      {subtitle ? <p className="text-ink-soft mt-2">{subtitle}</p> : null}
    </header>
  );
}
