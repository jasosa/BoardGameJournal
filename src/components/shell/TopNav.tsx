import Link from "next/link";
import { Suspense } from "react";
import { BarSearch } from "@/components/library/BarSearch";
import { BarStatusFilters } from "@/components/library/BarStatusFilters";
import { NavLink } from "./NavLink";
import { CAPTURE_ITEM, NAV_ITEMS } from "./nav-items";

export function TopNav() {
  return (
    <header className="border-line bg-canvas/80 fixed inset-x-0 top-0 z-10 hidden h-15 border-b backdrop-blur-md md:block">
      <div className="mx-auto flex h-full max-w-screen-2xl items-center gap-5 px-6">
        <Link
          href="/"
          className="font-display inline-flex min-h-11 items-center text-sm font-bold tracking-widest whitespace-nowrap uppercase"
        >
          Meeple Journal
        </Link>
        <nav aria-label="Main" className="flex gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              className="text-ink-soft hover:text-ink duration-fast rounded-input inline-flex min-h-11 items-center px-2 text-sm transition-colors"
              activeClassName="text-ink"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {/* These read the address, so they load after the first paint (a static page cannot know it). */}
        <Suspense fallback={<div className="min-h-11 w-44 lg:w-52 xl:w-72" />}>
          <BarSearch id="bar-search" className="w-44 lg:w-52 xl:w-72" />
        </Suspense>
        <div className="ml-auto flex items-center gap-4">
          <Suspense fallback={null}>
            <BarStatusFilters className="hidden xl:block" />
          </Suspense>
          <Link
            href={CAPTURE_ITEM.href}
            aria-label={CAPTURE_ITEM.label}
            className="border-ink text-ink hover:bg-ink hover:text-canvas duration-fast rounded-input inline-flex min-h-11 items-center gap-1 border px-4 text-xs font-bold tracking-widest uppercase transition-colors"
          >
            <span aria-hidden="true">+</span>
            Add
          </Link>
        </div>
      </div>
    </header>
  );
}
