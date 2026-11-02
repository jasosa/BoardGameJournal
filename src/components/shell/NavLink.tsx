"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive } from "./nav-items";

export function NavLink({
  href,
  className,
  activeClassName,
  children,
}: {
  href: string;
  className: string;
  activeClassName: string;
  children: React.ReactNode;
}) {
  const active = isActive(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : ""}`}
    >
      {children}
    </Link>
  );
}
