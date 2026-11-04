import { formatChangeDate } from "@/features/collection/history";
import { THOUGHT_TOPIC_KEYS, topicLabel, type ThoughtTopic } from "./topics";
import type { Thought } from "./schemas";

/** Rows shown at first, and added by each "Show more". */
export const PAGE_STEP = 10;

/** Thoughts are read this many at a time from the database. */
export const THOUGHT_LIMIT = 500;

export const formatThoughtDate = formatChangeDate;

/** Newest first: the date written, then the one saved last. */
export function sortNewestFirst(thoughts: Thought[]): Thought[] {
  return [...thoughts].sort((a, b) =>
    a.writtenOn === b.writtenOn
      ? b.createdAt.localeCompare(a.createdAt)
      : b.writtenOn.localeCompare(a.writtenOn),
  );
}

export type TopicCounts = Record<ThoughtTopic, number>;

export function topicCounts(thoughts: Thought[]): TopicCounts {
  const counts = Object.fromEntries(
    THOUGHT_TOPIC_KEYS.map((key) => [key, 0]),
  ) as TopicCounts;
  for (const thought of thoughts) {
    for (const key of thought.topics) counts[key] += 1;
  }
  return counts;
}

export type Tab = {
  /** "all" or a topic key. */
  key: "all" | ThoughtTopic;
  label: string;
  count: number;
  /** "Mechanics, 3 thoughts". */
  name: string;
};

function plural(count: number): string {
  return `${count} ${count === 1 ? "thought" : "thoughts"}`;
}

/**
 * The tabs: All, then only the topics that have thoughts, in the fixed order. The selected topic
 * stays even when its count dropped to 0, until another tab is chosen. No tabs when no thought
 * has a topic.
 */
export function visibleTabs(
  thoughts: Thought[],
  selected: "all" | ThoughtTopic,
): Tab[] {
  const counts = topicCounts(thoughts);
  const topicTabs = THOUGHT_TOPIC_KEYS.filter(
    (key) => counts[key] > 0 || key === selected,
  );
  const hasTopics = THOUGHT_TOPIC_KEYS.some((key) => counts[key] > 0);
  if (!hasTopics && selected === "all") return [];
  return [
    {
      key: "all" as const,
      label: "All",
      count: thoughts.length,
      name: `All, ${plural(thoughts.length)}`,
    },
    ...topicTabs.map((key) => ({
      key,
      label: topicLabel(key),
      count: counts[key],
      name: `${topicLabel(key)}, ${plural(counts[key])}`,
    })),
  ];
}

export function filterThoughts(
  thoughts: Thought[],
  selected: "all" | ThoughtTopic,
): Thought[] {
  return selected === "all"
    ? thoughts
    : thoughts.filter((thought) => thought.topics.includes(selected));
}

/** The topics line of a row: all of them in All, the others in a topic view. */
export function topicsLine(
  thought: Thought,
  selected: "all" | ThoughtTopic,
): { prefix: string; text: string } | null {
  const shown =
    selected === "all"
      ? thought.topics
      : thought.topics.filter((key) => key !== selected);
  if (shown.length === 0) return null;
  return {
    prefix: selected === "all" ? "" : "also: ",
    text: shown.map((key) => topicLabel(key).toLowerCase()).join(" · "),
  };
}

/** "Show 10 more", or "Show 4 more" for the last step. */
export function showMoreLabel(total: number, shown: number): string | null {
  const left = total - shown;
  if (left <= 0) return null;
  return `Show ${Math.min(PAGE_STEP, left)} more`;
}
