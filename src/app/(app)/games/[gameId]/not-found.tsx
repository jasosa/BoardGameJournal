import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";

export default function GameNotFound() {
  return (
    <>
      <PageHeader title="We could not find that game" />
      <EmptyState
        title="Nothing to show"
        body="It may have been removed, or the link is wrong."
        action={{ href: "/library", label: "Back to Library" }}
      />
    </>
  );
}
