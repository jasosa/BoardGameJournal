import Link from "next/link";

export const metadata = { title: "Not found | Meeple Journal" };

/** Any address that does not exist, signed in or not. Uses the page's own dark tokens. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-ink-soft text-sm font-semibold tracking-widest uppercase">
        Meeple Journal
      </p>
      <h1 className="mt-4 text-4xl md:text-6xl">We could not find that page</h1>
      <p className="text-ink-soft mt-4 max-w-prose">
        The link may be wrong, or the page may have been moved.
      </p>
      <Link
        href="/library"
        className="border-ink text-ink hover:bg-ink hover:text-canvas duration-fast rounded-input focus-visible:outline-accent mt-8 inline-flex min-h-11 w-max items-center border px-4 text-sm font-medium transition-colors"
      >
        Back to Library
      </Link>
    </main>
  );
}
