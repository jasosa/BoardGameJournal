import Link from "next/link";
import { NavLink } from "./NavLink";
import { CAPTURE_ITEM, NAV_ITEMS } from "./nav-items";

export function TopNav() {
  return (
    <header className="border-line hidden border-b md:block">
      <div className="mx-auto flex max-w-5xl items-center gap-8 px-6 py-4">
        <Link
          href="/"
          className="font-display inline-flex min-h-11 items-center text-xl"
        >
          Meeple Journal
        </Link>
        <nav aria-label="Main" className="flex flex-1 gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              className="text-ink-soft hover:text-ink duration-fast rounded-input inline-flex min-h-11 items-center px-3 text-sm transition-colors"
              activeClassName="text-ink underline decoration-ink decoration-2 underline-offset-8"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link
          href={CAPTURE_ITEM.href}
          className="bg-bronze text-on-bronze hover:bg-bronze-deep duration-fast rounded-input focus-visible:outline-ink inline-flex min-h-11 items-center gap-1 px-4 text-sm font-medium transition-[background-color]"
        >
          <span aria-hidden="true">+</span>
          {CAPTURE_ITEM.label}
        </Link>
      </div>
    </header>
  );
}
