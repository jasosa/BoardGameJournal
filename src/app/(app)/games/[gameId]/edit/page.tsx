import Link from "next/link";
import { notFound } from "next/navigation";
import { EditFactsForm } from "@/components/game/EditFactsForm";
import { PageHeader } from "@/components/shell/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { requireUser } from "@/server/authorization/require-user";
import { getGameDossier } from "@/server/services/games";
import { updateFacts } from "./actions";

export const metadata = { title: "Edit facts | Meeple Journal" };

export default async function EditFactsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const { user, supabase } = await requireUser();
  const result = await getGameDossier(supabase, user.id, gameId);
  // Games the person cannot edit look the same as games that do not exist.
  if (!result.ok || !result.data.game.editable) notFound();
  const { game } = result.data;

  return (
    <>
      <BackLink fallbackHref={`/games/${game.id}`}>{game.title}</BackLink>
      <PageHeader title="Edit facts" subtitle={game.title} />
      <EditFactsForm
        gameId={game.id}
        initial={{
          year: game.year?.toString() ?? "",
          minPlayers: game.minPlayers?.toString() ?? "",
          maxPlayers: game.maxPlayers?.toString() ?? "",
          playTimeMin: game.playTimeMin?.toString() ?? "",
          description: game.description ?? "",
        }}
        action={updateFacts}
        cancel={
          <Link
            href={`/games/${game.id}`}
            className="text-ink-soft hover:text-ink inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Cancel
          </Link>
        }
      />
    </>
  );
}
