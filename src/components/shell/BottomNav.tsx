import Link from "next/link";
import { NavLink } from "./NavLink";
import { CAPTURE_ITEM, NAV_ITEMS, type NavItem } from "./nav-items";

const linkClass =
  "text-ink-soft duration-fast flex min-h-14 items-center justify-center border-t-2 border-transparent text-sm transition-colors";
const activeClass = "text-ink aria-[current=page]:border-ink font-medium";

function Items({ items }: { items: readonly NavItem[] }) {
  return items.map((item) => (
    <NavLink
      key={item.href}
      href={item.href}
      className={linkClass}
      activeClassName={activeClass}
    >
      {item.label}
    </NavLink>
  ));
}

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="bg-canvas/90 border-line pb-safe fixed inset-x-0 bottom-0 z-10 border-t backdrop-blur-md md:hidden"
    >
      <div className="grid grid-cols-5 items-center">
        <Items items={NAV_ITEMS.slice(0, 2)} />
        <Link
          href={CAPTURE_ITEM.href}
          aria-label={CAPTURE_ITEM.label}
          className="bg-accent text-on-accent shadow-lift duration-fast active:bg-accent-strong focus-visible:outline-ink mx-auto -mt-6 flex size-14 items-center justify-center rounded-full transition-[background-color]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
        <Items items={NAV_ITEMS.slice(2)} />
      </div>
    </nav>
  );
}
