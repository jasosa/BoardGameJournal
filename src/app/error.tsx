"use client";

/** Anything that throws while a page renders. Shows the dark theme instead of the default page. */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      role="alert"
      className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16"
    >
      <p className="text-ink-soft text-sm font-semibold tracking-widest uppercase">
        Meeple Journal
      </p>
      <h1 className="mt-4 text-4xl md:text-6xl">Something went wrong</h1>
      <p className="text-ink-soft mt-4 max-w-prose">
        Nothing you saved was lost. Try again in a moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="border-ink text-ink hover:bg-ink hover:text-canvas duration-fast rounded-input focus-visible:outline-accent mt-8 inline-flex min-h-11 w-max items-center border px-4 text-sm font-medium transition-colors"
      >
        Try again
      </button>
    </main>
  );
}
