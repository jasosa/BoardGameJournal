import { describe, expect, it } from "vitest";
import {
  clearAllThoughtDrafts,
  clearDraft,
  editDraftKey,
  newDraftKey,
  readDraft,
  sameTopics,
  writeDraft,
} from "./drafts";

function fakeStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("thought drafts", () => {
  it("builds keys per account, per game and per thought", () => {
    expect(newDraftKey("u1", "g1")).toBe("draft:thought:u1:new:g1");
    expect(editDraftKey("u1", "t1")).toBe("draft:thought:u1:edit:t1");
    // Two accounts on one browser never share a draft.
    expect(newDraftKey("u1", "g1")).not.toBe(newDraftKey("u2", "g1"));
  });

  it("clears every thought draft of every account, and nothing else", () => {
    const store = {
      ...fakeStore({
        "draft:thought:u1:new:g1": "{}",
        "draft:thought:u2:edit:t9": "{}",
        theme: "dark",
      }),
    };
    const listable = {
      getItem: store.getItem,
      setItem: store.setItem,
      removeItem: store.removeItem,
      key: (index: number) => [...store.data.keys()][index] ?? null,
      get length() {
        return store.data.size;
      },
    };
    clearAllThoughtDrafts(listable);
    expect([...store.data.keys()]).toEqual(["theme"]);
    expect(() => clearAllThoughtDrafts(null)).not.toThrow();
  });

  it("writes and reads back text and topics, in screen order", () => {
    const store = fakeStore();
    writeDraft("k", { text: "Hello", topics: ["combat", "theme"] }, store);
    expect(readDraft("k", store)).toEqual({
      text: "Hello",
      topics: ["theme", "combat"],
    });
  });

  it("stores topics without text, but not whitespace with no topics", () => {
    const store = fakeStore();
    writeDraft("k", { text: "  ", topics: ["theme"] }, store);
    expect(readDraft("k", store)).toEqual({ text: "  ", topics: ["theme"] });
    writeDraft("k", { text: " \n ", topics: [] }, store);
    expect(store.data.has("k")).toBe(false);
  });

  it("clears a draft", () => {
    const store = fakeStore();
    writeDraft("k", { text: "x", topics: [] }, store);
    clearDraft("k", store);
    expect(readDraft("k", store)).toBeNull();
  });

  it("ignores broken or unknown content", () => {
    expect(readDraft("k", fakeStore({ k: "{oops" }))).toBeNull();
    expect(readDraft("k", fakeStore({ k: "[]" }))).toBeNull();
    expect(readDraft("k", fakeStore({ k: '{"text":5}' }))).toBeNull();
    expect(
      readDraft(
        "k",
        fakeStore({ k: '{"text":"a","topics":["humour","theme",3]}' }),
      ),
    ).toEqual({ text: "a", topics: ["theme"] });
  });

  it("does nothing when storage is missing or throws", () => {
    expect(readDraft("k", null)).toBeNull();
    expect(() =>
      writeDraft("k", { text: "x", topics: [] }, null),
    ).not.toThrow();
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readDraft("k", broken)).toBeNull();
    expect(() =>
      writeDraft("k", { text: "x", topics: [] }, broken),
    ).not.toThrow();
    expect(() => clearDraft("k", broken)).not.toThrow();
  });

  it("compares topic lists regardless of order", () => {
    expect(sameTopics(["theme", "combat"], ["combat", "theme"])).toBe(true);
    expect(sameTopics(["theme"], ["theme", "combat"])).toBe(false);
    expect(sameTopics([], [])).toBe(true);
  });
});
