// Fills one account's library with test games, as if added by hand.
//
// Usage:  npm run seed:library -- you@example.com
//
// It signs in as that user (see lib/sign-in-as.mjs) and then calls
// the same database functions the app calls, so RLS, constraints and the status history
// triggers all apply. Games whose title is already in the user's library are skipped, so it is
// safe to run twice. Local development only: never point it at a project with real data.
//
// Needs the three Supabase variables in .env.local. Server-side script: never import it from
// app code.

import { GAMES } from "./seed-data/library-games.mjs";
import { fail, signInAs } from "./lib/sign-in-as.mjs";

const email = process.argv[2]?.trim();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run seed:library -- <email>");
  process.exit(1);
}

const { db } = await signInAs(email);

/** YYYY-MM-DD for a number of days ago. */
function daysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

async function rpc(name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) fail(`${name}`, error);
  return data;
}

const { data: existing, error: existingError } = await db
  .from("games")
  .select("name");
if (existingError) fail("Reading existing games", existingError);
const have = new Set((existing ?? []).map((g) => g.name.toLowerCase()));

let added = 0;
let skipped = 0;
let ratings = 0;
let thoughts = 0;

for (const game of GAMES) {
  if (have.has(game.name.toLowerCase())) {
    skipped += 1;
    continue;
  }

  // Games with a sale date start as owned, then move to previously owned.
  const firstStatus =
    game.status === "previously_owned" ? "owned" : game.status;
  const entryId = await rpc("add_manual_game", {
    p_title: game.name,
    p_status: firstStatus,
    p_added_on: daysAgo(game.added),
  });
  if (game.status === "previously_owned") {
    await rpc("change_entry_status", {
      p_entry_id: entryId,
      p_status: "previously_owned",
      p_changed_on: daysAgo(game.sold ?? 1),
    });
  }

  const { data: entry, error: entryError } = await db
    .from("collection_entries")
    .select("game_id")
    .eq("id", entryId)
    .single();
  if (entryError) fail(`Reading the entry for ${game.name}`, entryError);
  const gameId = entry.game_id;

  const { error: factsError } = await db
    .from("games")
    .update({
      year: game.year,
      min_players: game.min,
      max_players: game.max,
      play_time_min: game.time,
      kind: game.kind,
    })
    .eq("id", gameId);
  if (factsError) fail(`Saving facts for ${game.name}`, factsError);

  for (const [ago, score] of game.ratings) {
    await rpc("add_assessment", {
      p_game_id: gameId,
      p_overall: score,
      p_assessed_on: daysAgo(ago),
    });
    ratings += 1;
  }
  for (const [ago, topics, body] of game.thoughts) {
    await rpc("add_thought", {
      p_game_id: gameId,
      p_body: body,
      p_topics: topics,
      p_written_on: daysAgo(ago),
    });
    thoughts += 1;
  }
  for (const [status, ago] of game.copies ?? []) {
    await rpc("add_game_copy", {
      p_game_id: gameId,
      p_status: status,
      p_added_on: daysAgo(ago),
    });
  }

  added += 1;
}

console.log(
  `Done for ${email}: ${added} games added, ${skipped} skipped (already there), ` +
    `${ratings} ratings, ${thoughts} thoughts.`,
);
