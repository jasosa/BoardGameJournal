export type GameFacts = {
  year: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMin: number | null;
};

function players(min: number | null, max: number | null): string | null {
  const low = min ?? max;
  const high = max ?? min;
  if (low === null || high === null) return null;
  if (low === high) return `${low} ${low === 1 ? "player" : "players"}`;
  return `${low}-${high} players`;
}

/**
 * One line of facts, for example "1-5 players · 40 min · 2019".
 * Unknown parts are skipped. Returns null when nothing is known.
 */
export function formatFacts(facts: GameFacts): string | null {
  const parts = [
    players(facts.minPlayers, facts.maxPlayers),
    facts.playTimeMin === null ? null : `${facts.playTimeMin} min`,
    facts.year === null ? null : String(facts.year),
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
}
