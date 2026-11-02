import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";

export default function Home() {
  return (
    <>
      <PageHeader title="Today" />
      <EmptyState
        title="Nothing here yet"
        body="Add your first game or log a play."
        action={{ href: "/capture", label: "Add a game" }}
      />
    </>
  );
}
