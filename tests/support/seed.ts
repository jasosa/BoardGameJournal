import { adminClient } from "./accounts";

type Seed = {
  name: string;
  status: "owned" | "wishlist" | "interested" | "previously_owned";
  year?: number;
  min?: number;
  max?: number;
  time?: number;
};

/** A few games with known facts. They are the newest, so they come first under "recent". */
export const SPECIAL_GAMES: Seed[] = [
  {
    name: "Wingspan",
    status: "owned",
    year: 2019,
    min: 1,
    max: 5,
    time: 40,
  },
  { name: "Café Terrace", status: "wishlist", min: 2, max: 4, time: 30 },
  { name: "Zen Garden", status: "interested", min: 1, max: 1, time: 20 },
  { name: "Arkham", status: "previously_owned", min: 1, max: 4, time: 180 },
  { name: "Catan", status: "owned" },
];

/**
 * Gives an account `total` games (copies): the special ones above, then "Filler 001"...
 * owned, 2 to 4 players, 90 minutes. Uses the service role, so tests only.
 */
export async function seedLibrary(userId: string, total = 250): Promise<void> {
  const admin = adminClient();
  const fillers: Seed[] = Array.from(
    { length: total - SPECIAL_GAMES.length },
    (_, i) => ({
      name: `Filler ${String(i + 1).padStart(3, "0")}`,
      status: "owned",
      min: 2,
      max: 4,
      time: 90,
    }),
  );
  const seeds = [...SPECIAL_GAMES, ...fillers];

  const { data: games, error } = await admin
    .from("games")
    .insert(
      seeds.map((seed) => ({
        name: seed.name,
        source: "manual",
        visibility: "private",
        created_by: userId,
        year: seed.year ?? null,
        min_players: seed.min ?? null,
        max_players: seed.max ?? null,
        play_time_min: seed.time ?? null,
      })),
    )
    .select("id, name");
  if (error || !games) throw error ?? new Error("seeding games failed");
  const idByName = new Map(games.map((g) => [g.name, g.id]));

  // Explicit times, newest first in the order given, so the order is not a tie.
  const base = Date.now();
  const { error: entryError } = await admin.from("collection_entries").insert(
    seeds.map((seed, index) => ({
      user_id: userId,
      game_id: idByName.get(seed.name)!,
      status: seed.status,
      created_at: new Date(base - index * 1000).toISOString(),
    })),
  );
  if (entryError) throw entryError;
}
