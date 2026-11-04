"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { clearDraft, sameTopics, writeDraft } from "@/features/thoughts/drafts";
import {
  THOUGHT_MAX_LENGTH,
  characterCount,
  thoughtBodyProblem,
} from "@/features/thoughts/schemas";
import { THOUGHT_TOPICS, type ThoughtTopic } from "@/features/thoughts/topics";
import type { SaveResult } from "./types";

/** The count shows once this few characters are left. */
const COUNTER_FROM = 500;

const quietBordered =
  "border-edge text-ink hover:border-ink focus-visible:outline-accent rounded-input inline-flex min-h-11 items-center justify-center border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60";

export type ComposerState = {
  text: string;
  topics: ThoughtTopic[];
};

/**
 * The box for writing a thought, new or edited: text, topics, a hint or a counter, Cancel and
 * Save. It keeps a draft on this device while you type. It does not close by itself: the parent
 * closes it after a save, a cancel or a discard.
 */
export function ThoughtComposer({
  mode,
  textLabel,
  groupLabel,
  draftKey,
  initialText,
  initialTopics,
  savedText,
  savedTopics,
  notice,
  focusOnOpen,
  saveLabel,
  showHint,
  onSave,
  onCancel,
  onDiscardNotice,
}: {
  mode: "new" | "edit";
  /** The visually hidden label of the text box. */
  textLabel: string;
  groupLabel: string;
  draftKey: string;
  initialText: string;
  initialTopics: ThoughtTopic[];
  /** Edit only: what is saved, so a draft equal to it is not kept. */
  savedText?: string;
  savedTopics?: ThoughtTopic[];
  /** "Restored your unsaved draft." with its button, when a draft was put back. */
  notice: { message: string; action: string } | null;
  /** Put focus in the text box, caret at the end. */
  focusOnOpen: boolean;
  saveLabel: string;
  showHint: boolean;
  onSave: (text: string, topics: ThoughtTopic[]) => Promise<SaveResult>;
  onCancel: (state: ComposerState) => void;
  onDiscardNotice: (state: ComposerState) => void;
}) {
  const [text, setText] = useState(initialText);
  const [topics, setTopics] = useState<ThoughtTopic[]>(initialTopics);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  // Set once the parent is about to close the composer for good, so the unmount below does not
  // write the draft again after it was cleared.
  const closing = useRef(false);
  const latest = useRef<ComposerState>({
    text: initialText,
    topics: initialTopics,
  });
  const boxId = useId();
  const problemId = useId();

  useEffect(() => {
    latest.current = { text, topics };
  });

  function persist(state: ComposerState) {
    const unchanged =
      mode === "edit" &&
      state.text === (savedText ?? "") &&
      sameTopics(state.topics, savedTopics ?? []);
    // A new thought with no text and only the topic that was pressed for you is not a draft.
    const untouched =
      mode === "new" &&
      state.text.trim() === "" &&
      sameTopics(state.topics, initialTopics);
    if (unchanged || untouched) clearDraft(draftKey);
    else writeDraft(draftKey, state);
  }

  // A draft is written about half a second after each change, and once more when the composer is
  // closed by the page (for example when another one opens), so nothing typed is lost.
  useEffect(() => {
    const timer = setTimeout(() => persist({ text, topics }), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist only reads props that do not change while open
  }, [text, topics]);
  useEffect(
    () => () => {
      if (!closing.current) persist(latest.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on unmount only
    [],
  );

  // The box grows with the text, up to about sixteen rows, then scrolls.
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight + 2}px`;
  }, [text]);

  useEffect(() => {
    if (!focusOnOpen) return;
    const element = box.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, [focusOnOpen]);

  const remaining = THOUGHT_MAX_LENGTH - characterCount(text.trim());
  const over = remaining < 0;
  const counter =
    remaining <= COUNTER_FROM
      ? over
        ? `${(-remaining).toLocaleString("en-GB")} characters too many`
        : `${remaining.toLocaleString("en-GB")} characters left`
      : null;

  function toggle(topic: ThoughtTopic) {
    setTopics((current) =>
      current.includes(topic)
        ? current.filter((item) => item !== topic)
        : THOUGHT_TOPICS.map((item) => item.key).filter(
            (key) => key === topic || current.includes(key),
          ),
    );
  }

  async function save() {
    if (pending) return;
    const message = thoughtBodyProblem(text);
    if (message) {
      setProblem(message);
      box.current?.focus();
      return;
    }
    setPending(true);
    setSaveError(null);
    const result = await onSave(text, topics);
    if (result.ok) {
      closing.current = true;
      return;
    }
    setPending(false);
    if (result.field === "body") {
      setProblem(result.message);
      box.current?.focus();
    } else {
      setSaveError(result.message);
      // The button is enabled again on the next render; focus it then.
      requestAnimationFrame(() => saveButton.current?.focus());
    }
  }

  function cancel() {
    if (pending) return;
    closing.current = true;
    onCancel({ text, topics });
  }

  function discardNotice() {
    if (pending) return;
    closing.current = true;
    onDiscardNotice({ text, topics });
  }

  return (
    <div
      role="group"
      aria-label={groupLabel}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          cancel();
        }
      }}
      className="bg-raised rounded-card shadow-lift flex max-w-2xl flex-col gap-3.5 p-3 max-md:-mx-2 md:p-4"
    >
      {notice ? (
        <div className="flex flex-wrap items-center gap-x-4">
          <p className="text-ink text-sm">{notice.message}</p>
          <button
            type="button"
            onClick={discardNotice}
            className="text-ink-soft hover:text-ink inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            {notice.action}
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor={boxId} className="sr-only">
          {textLabel}
        </label>
        <textarea
          ref={box}
          id={boxId}
          value={text}
          readOnly={pending}
          rows={5}
          placeholder={mode === "new" ? "Add a thought" : undefined}
          aria-invalid={problem || over ? true : undefined}
          aria-describedby={problem ? problemId : undefined}
          onChange={(event) => {
            setText(event.target.value);
            if (problem) setProblem(null);
          }}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              void save();
            }
          }}
          className={`bg-canvas text-ink placeholder:text-ink-faint rounded-input max-h-100 min-h-32 w-full resize-none overflow-y-auto border px-3 py-2.5 text-base leading-relaxed ${
            problem || over ? "border-negative" : "border-edge"
          } ${pending ? "opacity-75" : ""}`}
        />
        {problem ? (
          <p id={problemId} role="alert" className="text-negative text-sm">
            {problem}
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-ink-soft mb-2 text-xs font-semibold tracking-widest uppercase">
          Topics{" "}
          <span className="text-ink-faint text-meta font-normal tracking-normal normal-case">
            (optional)
          </span>
        </p>
        <div
          role="group"
          aria-label="Topics for this thought"
          className="flex flex-wrap gap-2"
        >
          {THOUGHT_TOPICS.map((topic) => (
            <button
              key={topic.key}
              type="button"
              aria-pressed={topics.includes(topic.key)}
              disabled={pending}
              onClick={() => toggle(topic.key)}
              className="border-edge text-ink-soft aria-pressed:pressed-glow aria-pressed:bg-canvas aria-pressed:text-ink aria-pressed:font-medium duration-fast rounded-input inline-flex min-h-11 items-center border px-3.5 text-sm whitespace-nowrap transition-colors disabled:opacity-60"
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {saveError ? (
        <p role="alert" className="text-negative text-sm">
          {saveError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {counter ? (
          <p className={`text-sm ${over ? "text-negative" : "text-ink-soft"}`}>
            {counter}
          </p>
        ) : showHint ? (
          <p className="text-ink-soft text-sm leading-snug max-md:basis-full">
            Light Markdown works:{" "}
            <code className="text-ink bg-canvas rounded-input px-1 font-sans">
              **bold**
            </code>
            ,{" "}
            <code className="text-ink bg-canvas rounded-input px-1 font-sans">
              _italics_
            </code>
            , lists, links. A draft stays on this device until you save.
          </p>
        ) : (
          <span />
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className={quietBordered}
          >
            Cancel
          </button>
          <Button
            ref={saveButton}
            type="button"
            onClick={() => void save()}
            disabled={pending}
          >
            {pending ? "Saving" : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
