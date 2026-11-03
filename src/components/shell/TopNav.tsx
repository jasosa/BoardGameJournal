import Link from "next/link";
import { NavLink } from "./NavLink";
import { CAPTURE_ITEM, NAV_ITEMS } from "./nav-items";

export function TopNav() {
  return (
    <header className="border-line bg-paper/80 fixed inset-x-0 top-0 z-10 hidden h-16 border-b backdrop-blur-md md:block">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-8 px-6">
        <Link
          href="/"
          className="font-display inline-flex min-h-11 items-center text-sm font-bold tracking-widest uppercase"
        >
          Meeple Journal
        </Link>
        <nav aria-label="Main" className="flex flex-1 gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              className="text-ink-soft hover:text-ink duration-fast rounded-input inline-flex min-h-11 items-center px-3 text-sm transition-colors"
              activeClassName="text-ink"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link
          href={CAPTURE_ITEM.href}
          className="border-ink text-ink hover:bg-ink hover:text-paper duration-fast rounded-input inline-flex min-h-11 items-center gap-1 border px-4 text-sm font-medium transition-colors"
        >
          <span aria-hidden="true">+</span>
          {CAPTURE_ITEM.label}
        </Link>
      </div>
    </header>
  );
}
