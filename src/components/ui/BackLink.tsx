"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type NavigationLike = {
  currentEntry: { index: number } | null;
  entries(): { url: string | null }[];
};

/** True when the previous history entry is a page of this app. */
function cameFromThisApp(): boolean {
  const navigation = (window as unknown as { navigation?: NavigationLike })
    .navigation;
  if (navigation?.currentEntry) {
    const previous = navigation.entries()[navigation.currentEntry.index - 1];
    return (
      Boolean(previous?.url) &&
      new URL(previous!.url!).origin === window.location.origin
    );
  }
  // Browsers without the Navigation API: best guess.
  return window.history.length > 1;
}

/**
 * Goes back to the page the person came from. When there is no earlier page of this app
 * (opened directly, from another site, or in a new tab) it is a normal link to
 * `fallbackHref`, so it also works before scripts load.
 */
export function BackLink({
  fallbackHref,
  children = "Back",
}: {
  fallbackHref: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={fallbackHref}
      onClick={(event) => {
        if (cameFromThisApp()) {
          event.preventDefault();
          router.back();
        }
      }}
      className="text-ink-soft hover:text-ink duration-fast -ml-1 mb-4 inline-flex min-h-11 items-center gap-2 px-1 text-sm transition-colors"
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
