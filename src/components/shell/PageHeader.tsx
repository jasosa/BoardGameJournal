export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl md:text-4xl">{title}</h1>
      {subtitle ? <p className="text-ink-soft mt-2">{subtitle}</p> : null}
    </header>
  );
}
