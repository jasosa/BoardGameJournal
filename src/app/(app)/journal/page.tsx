import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata = { title: "Journal | Meeple Journal" };

export default function JournalPage() {
  return (
    <>
      <PageHeader title="Journal" />
      <EmptyState
        title="Coming soon"
        body="Your plays and thoughts will live here."
      />
    </>
  );
}
