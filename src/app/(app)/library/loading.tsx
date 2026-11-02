import { PageHeader } from "@/components/shell/PageHeader";

export default function LibraryLoading() {
  return (
    <div aria-busy="true">
      <PageHeader title="Library" />
      <p className="sr-only" role="status">
        Loading your library
      </p>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="bg-cream rounded-cover aspect-3/4" />
        ))}
      </ul>
    </div>
  );
}
