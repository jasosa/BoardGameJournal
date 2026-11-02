import Link from "next/link";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="bg-paper text-ink rounded-input shadow-lift absolute top-2 right-2 z-20 -translate-y-20 px-4 py-2 focus:translate-y-0"
      >
        Skip to content
      </a>
      <TopNav />
      <div className="px-4 pt-2 md:hidden">
        <Link
          href="/"
          className="font-display inline-flex min-h-11 items-center text-xl"
        >
          Meeple Journal
        </Link>
      </div>
      <main
        id="main"
        className="mx-auto max-w-5xl px-4 pt-6 pb-28 md:px-6 md:pt-12 md:pb-16"
      >
        {children}
      </main>
      <BottomNav />
    </>
  );
}
