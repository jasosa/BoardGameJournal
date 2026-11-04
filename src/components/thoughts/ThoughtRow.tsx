"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { menuItemClass } from "@/components/game/ManageMenu";
import { formatThoughtDate, topicsLine } from "@/features/thoughts/list";
import type { Thought } from "@/features/thoughts/schemas";
import type { ThoughtTopic } from "@/features/thoughts/topics";
import { ThoughtText } from "./ThoughtText";
import type { DeleteResult } from "./types";

/** Height of the open "···" panel (two 44px items and 4px padding) plus a little room. */
const MENU_ROOM = 44 * 2 + 8 + 8;

function RowMenu({
  thoughtId,
  dateLabel,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  thoughtId: string;
  dateLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const deleteItem = useRef<HTMLButtonElement>(null);
  const [direction, setDirection] = useState<"down" | "up">("down");
  const panelId = useId();
  const label = `Actions for the thought from ${dateLabel}`;

  // A press anywhere outside closes the menu without moving focus.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) onOpenChange(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onOpenChange]);

  function toggle() {
    if (!open && trigger.current) {
      // Not enough room below the button in the screen: open above it instead.
      // On a phone the fixed bottom bar covers the lower part of the screen, so the room below
      // ends where that bar starts.
      const bar = document.querySelector<HTMLElement>('nav[aria-label="Main"]');
      const floor =
        bar && bar.offsetHeight > 0
          ? bar.getBoundingClientRect().top
          : window.innerHeight;
      const room = floor - trigger.current.getBoundingClientRect().bottom;
      setDirection(room < MENU_ROOM ? "up" : "down");
    }
    onOpenChange(!open);
  }

  return (
    <div
      ref={root}
      className="relative -my-2.5 -mr-2.5"
      onKeyDown={(event) => {
        if (!open) return;
        if (event.key === "Escape") {
          event.stopPropagation();
          onOpenChange(false);
          trigger.current?.focus();
        } else if (event.key === "Tab") {
          // Tabbing past either end leaves the menu, so it closes.
          const target = event.target as Node;
          if (!event.shiftKey && target === deleteItem.current) {
            onOpenChange(false);
          } else if (event.shiftKey && target === trigger.current) {
            onOpenChange(false);
          }
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        data-fid={`dots:${thoughtId}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={toggle}
        className="text-ink-soft hover:text-ink focus-visible:outline-accent rounded-input grid size-11 place-items-center border border-transparent text-lg tracking-widest focus-visible:outline-2 focus-visible:outline-offset-2 aria-expanded:border-edge"
      >
        <span aria-hidden="true">···</span>
      </button>
      <div
        id={panelId}
        role="group"
        aria-label={label}
        hidden={!open}
        className={`bg-raised rounded-card shadow-lift absolute right-2.5 z-20 flex w-50 max-w-[calc(100vw-2rem)] flex-col p-1 ${
          direction === "up" ? "bottom-full mb-1" : "top-full mt-1"
        }`}
      >
        <button
          type="button"
          aria-label={`Edit thought from ${dateLabel}`}
          onClick={() => {
            onOpenChange(false);
            onEdit();
          }}
          className={menuItemClass}
        >
          Edit
        </button>
        <button
          ref={deleteItem}
          type="button"
          aria-label={`Delete thought from ${dateLabel}`}
          onClick={() => {
            onOpenChange(false);
            onDelete();
          }}
          className={menuItemClass}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/**
 * One thought: its date and "···" menu, the text, and a line with "Show all" and the topics. In
 * edit mode the composer replaces the text; asking to delete shows the confirm inside the row.
 */
export function ThoughtRow({
  thought,
  selected,
  highlight,
  menuOpen,
  onMenuOpenChange,
  onEdit,
  onAskDelete,
  editor,
  confirming,
  onCancelDelete,
  onDelete,
}: {
  thought: Thought;
  /** "all" or the topic whose tab is selected. */
  selected: "all" | ThoughtTopic;
  /** A thought that was just saved. */
  highlight: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onAskDelete: () => void;
  /** The composer, when this row is being edited. */
  editor: React.ReactNode | null;
  confirming: boolean;
  onCancelDelete: () => void;
  onDelete: () => Promise<DeleteResult>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const textId = useId();
  const dateLabel = formatThoughtDate(thought.writtenOn);
  const line = topicsLine(thought, selected);
  const handleOverflow = useCallback(
    (value: boolean) => setOverflowing(value),
    [],
  );
  const editing = editor !== null;
  const showAll = overflowing || expanded;

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await onDelete();
    if (!result.ok) {
      setDeleting(false);
      setDeleteError(result.message);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(`[data-fid="delete:${thought.id}"]`)
          ?.focus(),
      );
    }
  }

  return (
    <article
      tabIndex={-1}
      data-fid={`row:${thought.id}`}
      onKeyDown={(event) => {
        // Escape closes the delete confirm first (the menu and the composer handle their own).
        if (event.key === "Escape" && confirming && !deleting) {
          event.stopPropagation();
          onCancelDelete();
        }
      }}
      className={`border-line focus-visible:outline-accent border-t py-4.5 first:border-t-0 first:pt-1 focus-visible:outline-2 focus-visible:outline-offset-4 ${
        highlight
          ? "thought-new rounded-card -mx-3 border-t-transparent px-3"
          : ""
      }`}
    >
      <div className="flex min-h-6 items-center justify-between">
        <time
          dateTime={thought.writtenOn}
          className="text-ink-faint text-xs font-semibold tracking-widest uppercase"
        >
          {dateLabel}
        </time>
        {editing || confirming ? null : (
          <RowMenu
            thoughtId={thought.id}
            dateLabel={dateLabel}
            open={menuOpen}
            onOpenChange={onMenuOpenChange}
            onEdit={onEdit}
            onDelete={onAskDelete}
          />
        )}
      </div>

      {editing ? (
        <div className="mt-1">{editor}</div>
      ) : (
        <>
          <div className="mt-1.5">
            <ThoughtText
              id={textId}
              body={thought.body}
              clamped={!expanded}
              onOverflowChange={handleOverflow}
            />
          </div>
          {showAll || line ? (
            <div className="text-ink-soft text-meta mt-1.5 flex min-h-5 flex-wrap items-center gap-x-4">
              {showAll ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={textId}
                  onClick={() => setExpanded((value) => !value)}
                  className="text-ink-soft hover:text-ink focus-visible:outline-accent -my-3 inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {expanded ? "Show less" : "Show all"}
                </button>
              ) : null}
              {line ? (
                <span>
                  {line.prefix}
                  {line.text}
                </span>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {confirming ? (
        <div
          role="group"
          aria-label={`Delete thought from ${dateLabel}`}
          className="bg-raised rounded-card mt-1.5 flex max-w-2xl flex-col gap-3 p-3 md:px-4 md:py-3.5"
        >
          <p className="text-sm">
            Delete this thought? Its text and topics are removed for good. This
            cannot be undone.
          </p>
          {deleteError ? (
            <p role="alert" className="text-negative text-sm">
              {deleteError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-fid={`confirm-cancel:${thought.id}`}
              disabled={deleting}
              onClick={onCancelDelete}
              className="border-edge text-ink hover:border-ink focus-visible:outline-accent rounded-input inline-flex min-h-11 items-center justify-center border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              data-fid={`delete:${thought.id}`}
              disabled={deleting}
              onClick={() => void confirmDelete()}
              className="border-negative text-negative focus-visible:outline-accent rounded-input inline-flex min-h-11 items-center justify-center border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
            >
              {deleting ? "Deleting" : "Delete thought"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
