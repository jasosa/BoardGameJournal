import { PageHeader } from "@/components/shell/PageHeader";

export default function LibraryLoading() {
  return (
    <div aria-busy="true">
      <PageHeader title="Library" compact />
      <p className="sr-only" role="status">
        Loading your library
      </p>
      <div className="bg-cream rounded-input mb-8 min-h-11" />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i} className="bg-cream rounded-cover aspect-3/4" />
        ))}
      </ul>
    </div>
  );
}
