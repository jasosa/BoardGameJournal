import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata = { title: "Library | Meeple Journal" };

export default function LibraryPage() {
  return (
    <>
      <PageHeader title="Library" />
      <EmptyState title="Coming soon" body="Your collection will live here." />
    </>
  );
}
