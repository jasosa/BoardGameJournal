import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { CoverControls } from "@/components/game/CoverControls";
import { CoverTile } from "@/components/game/CoverTile";
import { StatusHistory } from "@/components/game/StatusHistory";
import { StatusPicker } from "@/components/game/StatusPicker";
import { BackLink } from "@/components/ui/BackLink";
import { GameBackdrop } from "@/components/game/GameBackdrop";
import { formatPlayers } from "@/features/catalogue/facts";
import { requireUser } from "@/server/authorization/require-user";
import { getGameDossier } from "@/server/services/games";
import { changeStatus } from "./actions";
import { removeCoverAction, uploadCoverAction } from "./cover-actions";

export const metadata = { title: "Game | Meeple Journal" };

const addedFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" });

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const { user, supabase } = await requireUser();
  const result = await getGameDossier(supabase, user.id, gameId);

  if (!result.ok) {
    if (result.error.code === "not_found") notFound();
    return (
      <>
        <BackLink fallbackHref="/library">Library</BackLink>
        <section role="alert" className="bg-cream rounded-card px-6 py-8">
          <h1 className="text-xl">Could not load this game</h1>
          <p className="text-ink-soft mt-2">{result.error.message}</p>
          <Link
            href={`/games/${gameId}`}
            className="text-ink mt-4 inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Try again
          </Link>
        </section>
      </>
    );
  }

  const { game, entries, history } = result.data;
  const facts = [
    ["Players", formatPlayers(game.minPlayers, game.maxPlayers)],
    ["Time", game.playTimeMin === null ? null : `${game.playTimeMin} min`],
    ["Year", game.year === null ? null : String(game.year)],
  ].filter((pair): pair is [string, string] => pair[1] !== null);

  const colours = game.coverColours;
  return (
    <div
      style={
        colours
          ? ({
              "--game-tint": colours.tint,
              "--game-glow": colours.glow,
            } as CSSProperties)
          : undefined
      }
    >
      <GameBackdrop tint={colours?.tint ?? null} />
      <BackLink fallbackHref="/library">Library</BackLink>

      <div className="grid grid-cols-[9rem_1fr] gap-x-5 gap-y-8 md:grid-cols-[22.5rem_1fr] md:gap-x-16">
        <div className="md:sticky md:top-20 md:row-span-2 md:self-start">
          <CoverTile title={game.title} cover={game.cover} />
          {game.editable ? (
            <div className="mt-3">
              <CoverControls
                gameId={game.id}
                hasCover={game.cover !== null}
                uploadAction={uploadCoverAction}
                removeAction={removeCoverAction}
              />
            </div>
          ) : null}
        </div>

        <header className="min-w-0">
          <h1 className="text-3xl break-words hyphens-auto md:text-8xl">
            {game.title}
          </h1>
          {facts.length > 0 ? (
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-ink-soft text-xs font-semibold tracking-widest uppercase">
                    {label}
                  </dt>
                  <dd className="font-display text-xl font-semibold">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </header>

        <div className="col-span-2 flex flex-col gap-10 md:col-span-1 md:col-start-2">
          {game.description ? (
            <p className="max-w-prose whitespace-pre-line">
              {game.description}
            </p>
          ) : null}

          <section aria-labelledby="status-heading">
            <h2 id="status-heading" className="mb-3 text-xl">
              Status
            </h2>
            {entries.length === 0 ? (
              <p className="text-ink-soft">
                This game is not in your collection.
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                {entries.map((entry, index) => (
                  <div key={entry.entryId}>
                    {entries.length > 1 ? (
                      <p className="text-ink-soft mb-2 text-sm">
                        Copy {index + 1}
                      </p>
                    ) : null}
                    <StatusPicker
                      entryId={entry.entryId}
                      current={entry.status}
                      label={
                        entries.length > 1
                          ? `Status of copy ${index + 1}`
                          : "Status"
                      }
                      action={changeStatus}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {game.editable ? (
            <div className="-mt-6">
              <Link
                href={`/games/${game.id}/edit`}
                className="text-ink-soft hover:text-ink inline-flex min-h-11 items-center text-sm underline underline-offset-4"
              >
                {facts.length > 0 || game.description
                  ? "Edit facts"
                  : "Add facts"}
              </Link>
            </div>
          ) : null}

          <section aria-labelledby="details-heading">
            <h2 id="details-heading" className="mb-3 text-xl">
              Details
            </h2>
            <dl className="text-ink-soft grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <dt>Source</dt>
              <dd className="text-ink">
                {game.source === "manual" ? "Manual entry" : game.source}
              </dd>
              <dt>Added</dt>
              <dd className="text-ink">
                {addedFormat.format(new Date(game.createdAt))}
              </dd>
            </dl>
          </section>

          {history.length > 0 ? (
            <StatusHistory
              entryIds={entries.map((entry) => entry.entryId)}
              history={history}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
