/**
 * The topics a thought can be marked with: parts of the game. The database accepts exactly these
 * keys (`topics_valid` in the journal_entries migration). The order here is the order on screen.
 */
export const THOUGHT_TOPICS = [
  { key: "mechanics", label: "Mechanics" },
  { key: "theme", label: "Theme" },
  { key: "artwork", label: "Artwork" },
  { key: "components", label: "Components" },
  { key: "production", label: "Production" },
  { key: "replayability", label: "Replayability" },
  { key: "solo_mode", label: "Solo mode" },
  { key: "interaction", label: "Interaction" },
  { key: "combat", label: "Combat" },
] as const;

export type ThoughtTopic = (typeof THOUGHT_TOPICS)[number]["key"];

export const THOUGHT_TOPIC_KEYS: readonly ThoughtTopic[] = THOUGHT_TOPICS.map(
  (topic) => topic.key,
);

export function isThoughtTopic(value: string): value is ThoughtTopic {
  return (THOUGHT_TOPIC_KEYS as readonly string[]).includes(value);
}

export function topicLabel(key: ThoughtTopic): string {
  return THOUGHT_TOPICS.find((topic) => topic.key === key)?.label ?? key;
}

/** Puts topics in the fixed screen order and drops anything unknown or repeated. */
export function normalizeTopics(values: readonly string[]): ThoughtTopic[] {
  return THOUGHT_TOPIC_KEYS.filter((key) => values.includes(key));
}
