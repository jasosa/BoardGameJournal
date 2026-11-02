import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata = { title: "Capture | Meeple Journal" };

export default function CapturePage() {
  return (
    <>
      <PageHeader title="Capture" />
      <EmptyState title="Coming soon" body="Quick Capture will live here." />
    </>
  );
}
