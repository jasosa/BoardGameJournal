import Link from "next/link";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="bg-canvas text-ink rounded-input shadow-lift absolute top-2 left-2 z-20 inline-flex min-h-11 -translate-y-20 items-center px-4 focus:translate-y-0"
      >
        Skip to content
      </a>
      <TopNav />
      <div className="px-4 pt-2 md:hidden">
        <Link
          href="/"
          className="font-display inline-flex min-h-11 items-center text-sm font-bold tracking-widest uppercase"
        >
          Meeple Journal
        </Link>
      </div>
      <main
        id="main"
        className="mx-auto max-w-screen-2xl px-4 pt-6 pb-28 md:px-6 md:pt-20 md:pb-16"
      >
        {children}
      </main>
      <BottomNav />
    </>
  );
}
