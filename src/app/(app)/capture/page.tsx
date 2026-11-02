import { AddGameForm } from "@/components/capture/AddGameForm";
import { PageHeader } from "@/components/shell/PageHeader";
import { addGame } from "./actions";

export const metadata = { title: "Add a game | Meeple Journal" };

export default function CapturePage() {
  return (
    <>
      <PageHeader
        title="Add a game"
        subtitle="Year, players and cover come later, from the game page."
      />
      <AddGameForm action={addGame} />
    </>
  );
}
