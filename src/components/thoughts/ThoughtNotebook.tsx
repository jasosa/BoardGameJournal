"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  addThoughtAction,
  deleteThoughtAction,
  updateThoughtAction,
} from "@/app/(app)/games/[gameId]/thought-actions";
import {
  clearDraft,
  editDraftKey,
  newDraftKey,
  readDraft,
} from "@/features/thoughts/drafts";
import {
  PAGE_STEP,
  filterThoughts,
  formatThoughtDate,
  showMoreLabel,
  sortNewestFirst,
  visibleTabs,
} from "@/features/thoughts/list";
import type { Thought } from "@/features/thoughts/schemas";
import { topicLabel, type ThoughtTopic } from "@/features/thoughts/topics";
import { ThoughtComposer, type ComposerState } from "./ThoughtComposer";
import { ThoughtRow } from "./ThoughtRow";
import { TopicTabs } from "./TopicTabs";
import type { DeleteResult, SaveResult } from "./types";

type Form =
  | {
      kind: "new";
      seq: number;
      text: string;
      topics: ThoughtTopic[];
      restored: boolean;
      focus: boolean;
    }
  | {
      kind: "edit";
      id: string;
      seq: number;
      text: string;
      topics: ThoughtTopic[];
      restored: boolean;
    };

/** A call that cannot reach the server (offline, timeout) becomes a failure message. */
async function attempt<T extends { ok: boolean }>(
  run: () => Promise<T>,
  failure: T,
): Promise<T> {
  try {
    return await run();
  } catch {
    return failure;
  }
}

const SAVE_NEW_FAILED =
  "Could not save your thought. It is still here and on this device. Try again.";
const SAVE_EDIT_FAILED =
  "Could not save your changes. They are still here and on this device. Try again.";
const DELETE_FAILED = "Could not delete this thought. Try again.";

const quietLink =
  "text-ink-soft hover:text-ink focus-visible:outline-accent inline-flex min-h-11 items-center text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2";

const bordered =
  "border-edge text-ink hover:border-ink focus-visible:outline-accent rounded-input inline-flex min-h-11 items-center justify-center border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * The Thoughts section of the game page: the "+ Add thought" link and composer, the topic
 * filter, and the dated list with edit and delete. It keeps its own list after each change, so
 * the screen answers at once; the server is the record.
 */
export function ThoughtNotebook({
  userId,
  gameId,
  thoughts: initial,
}: {
  userId: string;
  gameId: string;
  thoughts: Thought[];
}) {
  const [thoughts, setThoughts] = useState(initial);
  const [selected, setSelected] = useState<"all" | ThoughtTopic>("all");
  const [shown, setShown] = useState(PAGE_STEP);
  const [form, setForm] = useState<Form | null>(null);
  const [discarded, setDiscarded] = useState<ComposerState | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [status, setStatus] = useState({ text: "", n: 0 });
  const root = useRef<HTMLElement>(null);
  const seq = useRef(0);
  const focusRequest = useRef<string | null>(null);
  const latest = useRef({ thoughts, selected });
  const headingId = useId();

  useEffect(() => {
    latest.current = { thoughts, selected };
  });

  // Moves focus to what a finished action asked for, once it is on the screen.
  useEffect(() => {
    const id = focusRequest.current;
    if (!id) return;
    focusRequest.current = null;
    root.current?.querySelector<HTMLElement>(`[data-fid="${id}"]`)?.focus();
  });

  // A draft written earlier on this device comes back with the composer open. localStorage
  // cannot be read while the page is rendered on the server or hydrating, so this runs after.
  useEffect(() => {
    const draft = readDraft(newDraftKey(userId, gameId));
    if (draft) {
      setForm({
        kind: "new",
        seq: ++seq.current,
        text: draft.text,
        topics: draft.topics,
        restored: true,
        focus: false,
      });
    }
  }, [userId, gameId]);

  const tabs = visibleTabs(thoughts, selected);
  const filtered = filterThoughts(thoughts, selected);
  const visible = filtered.slice(0, shown);
  const newKey = newDraftKey(userId, gameId);

  function say(text: string) {
    setStatus((current) => ({ text, n: current.n + 1 }));
  }

  function neighbourOf(id: string): Thought | null {
    const list = filterThoughts(
      latest.current.thoughts,
      latest.current.selected,
    );
    const index = list.findIndex((thought) => thought.id === id);
    return list[index + 1] ?? list[index - 1] ?? null;
  }

  function openNew() {
    setConfirmId(null);
    setMenuId(null);
    setDiscarded(null);
    say("");
    const draft = readDraft(newKey);
    setForm(
      draft
        ? {
            kind: "new",
            seq: ++seq.current,
            text: draft.text,
            topics: draft.topics,
            restored: true,
            focus: true,
          }
        : {
            kind: "new",
            seq: ++seq.current,
            text: "",
            // The selected topic starts pressed, and can be unpressed.
            topics: selected === "all" ? [] : [selected],
            restored: false,
            focus: true,
          },
    );
  }

  function openEdit(thought: Thought) {
    setMenuId(null);
    setConfirmId(null);
    setDiscarded(null);
    const draft = readDraft(editDraftKey(userId, thought.id));
    setForm({
      kind: "edit",
      id: thought.id,
      seq: ++seq.current,
      text: draft ? draft.text : thought.body,
      topics: draft ? draft.topics : thought.topics,
      restored: draft !== null,
    });
  }

  function askDelete(id: string) {
    setMenuId(null);
    setConfirmId(id);
    focusRequest.current = `confirm-cancel:${id}`;
  }

  function cancelDelete(id: string) {
    setConfirmId(null);
    focusRequest.current = `dots:${id}`;
  }

  /** Closes the new-thought composer; text is kept for Undo, with a line saying so. */
  function closeNew(state: ComposerState) {
    clearDraft(newKey);
    setForm(null);
    if (state.text.trim() !== "") {
      setDiscarded(state);
      say("Draft discarded.");
      focusRequest.current = "undo";
    } else {
      focusRequest.current = "link";
    }
  }

  function undoDiscard() {
    if (!discarded) return;
    setForm({
      kind: "new",
      seq: ++seq.current,
      text: discarded.text,
      topics: discarded.topics,
      restored: false,
      focus: true,
    });
    setDiscarded(null);
    say("");
  }

  async function saveNew(
    text: string,
    topics: ThoughtTopic[],
  ): Promise<SaveResult> {
    const result: SaveResult = await attempt(
      () =>
        addThoughtAction({
          gameId,
          body: text,
          topics,
          // The person's own "today", not the server's.
          writtenOn: new Date().toLocaleDateString("en-CA"),
        }),
      { ok: false, message: SAVE_NEW_FAILED },
    );
    if (!result.ok) return result;
    clearDraft(newKey);
    const saved = result.thought;
    setThoughts((current) => sortNewestFirst([saved, ...current]));
    setForm(null);
    // A new thought outside the selected topic switches to All, so it can be seen.
    setSelected((current) =>
      current !== "all" && !saved.topics.includes(current) ? "all" : current,
    );
    setHighlightId(saved.id);
    // The highlight fades over two seconds; then the row is an ordinary one again.
    setTimeout(
      () =>
        setHighlightId((current) => (current === saved.id ? null : current)),
      2200,
    );
    say("Thought saved.");
    focusRequest.current = `row:${saved.id}`;
    return result;
  }

  async function saveEdit(
    id: string,
    text: string,
    topics: ThoughtTopic[],
  ): Promise<SaveResult> {
    const result: SaveResult = await attempt(
      () => updateThoughtAction({ thoughtId: id, body: text, topics }),
      { ok: false, message: SAVE_EDIT_FAILED },
    );
    if (!result.ok) return result;
    clearDraft(editDraftKey(userId, id));
    const saved = result.thought;
    const current = latest.current.selected;
    const leaves = current !== "all" && !saved.topics.includes(current);
    const next = leaves ? neighbourOf(id) : null;
    setThoughts((list) => list.map((item) => (item.id === id ? saved : item)));
    setForm(null);
    if (leaves) {
      say(
        `Changes saved. It is no longer under ${topicLabel(current).toLowerCase()}.`,
      );
      focusRequest.current = next ? `row:${next.id}` : "heading";
    } else {
      say("Changes saved.");
      focusRequest.current = `row:${id}`;
    }
    return result;
  }

  async function removeThought(id: string): Promise<DeleteResult> {
    const result: DeleteResult = await attempt(
      () => deleteThoughtAction({ thoughtId: id }),
      { ok: false, message: DELETE_FAILED },
    );
    if (!result.ok) return result;
    clearDraft(editDraftKey(userId, id));
    const next = neighbourOf(id);
    setThoughts((list) => list.filter((item) => item.id !== id));
    setConfirmId(null);
    setForm((current) =>
      current?.kind === "edit" && current.id === id ? null : current,
    );
    say("Thought deleted.");
    focusRequest.current = next ? `row:${next.id}` : "heading";
    return result;
  }

  function choose(key: "all" | ThoughtTopic) {
    setSelected(key);
    setShown(PAGE_STEP);
  }

  function showMore() {
    const first = filtered[shown];
    setShown((count) => count + PAGE_STEP);
    if (first) focusRequest.current = `row:${first.id}`;
  }

  const newOpen = form?.kind === "new";
  const showMoreText = showMoreLabel(filtered.length, visible.length);

  return (
    <section ref={root} aria-labelledby={headingId}>
      <div className="mb-2 flex min-h-11 items-center justify-between gap-4">
        <h2
          id={headingId}
          tabIndex={-1}
          data-fid="heading"
          className="text-xl focus:outline-none"
        >
          Thoughts
        </h2>
        {newOpen ? null : (
          <button
            type="button"
            data-fid="link"
            onClick={openNew}
            className={quietLink}
          >
            <span aria-hidden="true" className="mr-1.5">
              +
            </span>
            Add thought
          </button>
        )}
      </div>

      {form?.kind === "new" ? (
        <div className="mt-1.5 mb-1">
          <ThoughtComposer
            key={form.seq}
            mode="new"
            textLabel="New thought"
            groupLabel="New thought"
            draftKey={newKey}
            initialText={form.text}
            initialTopics={form.topics}
            notice={
              form.restored
                ? {
                    message: "Restored your unsaved draft.",
                    action: "Discard draft",
                  }
                : null
            }
            focusOnOpen={form.focus}
            saveLabel="Save"
            showHint
            onSave={saveNew}
            onCancel={closeNew}
            onDiscardNotice={closeNew}
          />
        </div>
      ) : null}

      {discarded ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-4">
          <p className="text-ink-soft text-sm">Draft discarded.</p>
          <button
            type="button"
            data-fid="undo"
            onClick={undoDiscard}
            className={quietLink}
          >
            Undo
          </button>
        </div>
      ) : null}

      {thoughts.length === 0 ? (
        newOpen ? null : (
          <p className="text-ink-soft mt-1 max-w-2xl">
            No thoughts yet. Write what you think of the game, and mark the
            parts it is about.
          </p>
        )
      ) : (
        <>
          <TopicTabs tabs={tabs} selected={selected} onSelect={choose} />
          {tabs.length === 0 ? <div className="mt-4" /> : null}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-start gap-1">
              <p className="text-ink-soft">
                No thoughts about{" "}
                {selected === "all" ? "" : topicLabel(selected).toLowerCase()}.
              </p>
              <button
                type="button"
                onClick={() => {
                  choose("all");
                  focusRequest.current = "tab:all";
                }}
                className={quietLink}
              >
                Show all thoughts
              </button>
            </div>
          ) : (
            <div>
              {visible.map((thought) => {
                const date = formatThoughtDate(thought.writtenOn);
                const editing =
                  form?.kind === "edit" && form.id === thought.id ? form : null;
                return (
                  <ThoughtRow
                    key={thought.id}
                    thought={thought}
                    selected={selected}
                    highlight={highlightId === thought.id}
                    menuOpen={menuId === thought.id}
                    onMenuOpenChange={(open) =>
                      setMenuId(open ? thought.id : null)
                    }
                    onEdit={() => openEdit(thought)}
                    onAskDelete={() => askDelete(thought.id)}
                    confirming={confirmId === thought.id}
                    onCancelDelete={() => cancelDelete(thought.id)}
                    onDelete={() => removeThought(thought.id)}
                    editor={
                      editing ? (
                        <ThoughtComposer
                          key={editing.seq}
                          mode="edit"
                          textLabel={`Edit thought from ${date}`}
                          groupLabel={`Edit thought from ${date}`}
                          draftKey={editDraftKey(userId, thought.id)}
                          initialText={editing.text}
                          initialTopics={editing.topics}
                          savedText={thought.body}
                          savedTopics={thought.topics}
                          notice={
                            editing.restored
                              ? {
                                  message: "Restored your unsaved changes.",
                                  action: "Discard changes",
                                }
                              : null
                          }
                          focusOnOpen
                          saveLabel="Save changes"
                          showHint={false}
                          onSave={(text, topics) =>
                            saveEdit(thought.id, text, topics)
                          }
                          onCancel={() => {
                            clearDraft(editDraftKey(userId, thought.id));
                            setForm(null);
                            focusRequest.current = `dots:${thought.id}`;
                          }}
                          onDiscardNotice={() => {
                            clearDraft(editDraftKey(userId, thought.id));
                            setForm({
                              kind: "edit",
                              id: thought.id,
                              seq: ++seq.current,
                              text: thought.body,
                              topics: thought.topics,
                              restored: false,
                            });
                          }}
                        />
                      ) : null
                    }
                  />
                );
              })}
            </div>
          )}

          {showMoreText ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1">
              <button type="button" onClick={showMore} className={bordered}>
                {showMoreText}
              </button>
              <span className="text-ink-soft text-sm">
                {visible.length} of {filtered.length} shown
              </span>
            </div>
          ) : null}
        </>
      )}

      {/* One live region, always on the page, so a change of its text is announced. A
          non-breaking space on every other message lets the same words be read twice. */}
      <p role="status" aria-live="polite" className="sr-only">
        {status.text === ""
          ? ""
          : status.text + (status.n % 2 === 0 ? " " : "")}
      </p>
    </section>
  );
}
