import Link from "next/link";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <section className="bg-cream rounded-card px-6 py-8">
      <h2 className="text-xl">{title}</h2>
      <p className="text-ink-soft mt-2 max-w-prose">{body}</p>
      {action ? (
        <Link
          href={action.href}
          className="border-line text-ink hover:border-bronze duration-fast rounded-input mt-6 border inline-flex min-h-11 items-center px-4 text-sm font-medium transition-colors"
        >
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
