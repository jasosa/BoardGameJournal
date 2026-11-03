export type NavItem = { href: string; label: string };

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/journal", label: "Journal" },
  { href: "/settings", label: "Settings" },
];

export const CAPTURE_ITEM: NavItem = {
  href: "/capture",
  label: "Add game",
};

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
