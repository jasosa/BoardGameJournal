import { AddGameForm } from "@/components/capture/AddGameForm";
import { PageHeader } from "@/components/shell/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { TITLE_MAX_LENGTH } from "@/features/collection/schemas";
import { addGame } from "./actions";

export const metadata = { title: "Add a game | Meeple Journal" };

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string | string[] }>;
}) {
  const { title } = await searchParams;
  const initialTitle = (Array.isArray(title) ? title[0] : title) ?? "";
  return (
    <>
      <BackLink fallbackHref="/library" />
      <PageHeader
        title="Add a game"
        subtitle="Year, players and cover come later, from the game page."
      />
      <AddGameForm
        action={addGame}
        initialTitle={initialTitle.trim().slice(0, TITLE_MAX_LENGTH)}
      />
    </>
  );
}
