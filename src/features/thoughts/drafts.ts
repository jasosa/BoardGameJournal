import { isThoughtTopic, normalizeTopics, type ThoughtTopic } from "./topics";

/**
 * Unsaved thoughts live in the browser (ADR-0005): per device, not backed up, cleared after a
 * save, a cancel or a discard. Every function takes the storage so tests can pass a fake one;
 * with none, it uses localStorage and quietly does nothing when that is blocked.
 */
export type Draft = { text: string; topics: ThoughtTopic[] };

/** Drafts are kept per account, so a shared browser never shows one person's text to another. */
export const DRAFT_PREFIX = "draft:thought:";
export const newDraftKey = (userId: string, gameId: string) =>
  `${DRAFT_PREFIX}${userId}:new:${gameId}`;
export const editDraftKey = (userId: string, thoughtId: string) =>
  `${DRAFT_PREFIX}${userId}:edit:${thoughtId}`;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type ListableStore = Store & Pick<Storage, "key" | "length">;

function defaultStore(): ListableStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readDraft(
  key: string,
  store: Store | null = defaultStore(),
): Draft | null {
  try {
    const raw = store?.getItem(key);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    const { text, topics } = data as { text?: unknown; topics?: unknown };
    if (typeof text !== "string") return null;
    const list = Array.isArray(topics)
      ? topics.filter(
          (topic): topic is string =>
            typeof topic === "string" && isThoughtTopic(topic),
        )
      : [];
    return { text, topics: normalizeTopics(list) };
  } catch {
    return null;
  }
}

export function clearDraft(
  key: string,
  store: Store | null = defaultStore(),
): void {
  try {
    store?.removeItem(key);
  } catch {
    // Storage can be blocked or full; a draft is a convenience.
  }
}

/** Writes the draft, or removes it when it is only whitespace with no topics. */
export function writeDraft(
  key: string,
  draft: Draft,
  store: Store | null = defaultStore(),
): void {
  if (draft.text.trim() === "" && draft.topics.length === 0) {
    clearDraft(key, store);
    return;
  }
  try {
    store?.setItem(key, JSON.stringify(draft));
  } catch {
    // Storage can be blocked or full; a draft is a convenience.
  }
}

export function sameTopics(
  a: readonly ThoughtTopic[],
  b: readonly ThoughtTopic[],
): boolean {
  return a.length === b.length && a.every((topic) => b.includes(topic));
}

/** Removes every thought draft of every account from this browser (used when signing out). */
export function clearAllThoughtDrafts(
  store: ListableStore | null = defaultStore(),
): void {
  try {
    if (!store) return;
    const keys: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key?.startsWith(DRAFT_PREFIX)) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  } catch {
    // Storage can be blocked; there is nothing to clear then.
  }
}
