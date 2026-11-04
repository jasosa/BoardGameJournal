"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

const CloseMenu = createContext<() => void>(() => {});

/** Items call this when their action has finished, so the menu closes by itself. */
export function useCloseMenu() {
  return useContext(CloseMenu);
}

/** Shared look of a row in the menu: a link or a button. */
export const menuItemClass =
  "text-ink-soft hover:text-ink hover:bg-canvas focus-visible:outline-accent duration-fast rounded-input flex min-h-11 w-full items-center px-3 text-left text-sm transition-colors focus-visible:outline-2 disabled:opacity-60";

/**
 * One quiet place for the things you do to a game now and then: edit facts, change the cover,
 * remove it from the library. A disclosure, not an ARIA menu: items are ordinary links and
 * buttons reached with Tab. Items stay mounted while it is closed, so an action that is still
 * running (an upload) is not cancelled by closing.
 */
export function ManageMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="text-ink-soft hover:text-ink border-edge focus-visible:outline-accent duration-fast rounded-input inline-flex min-h-11 items-center gap-2 border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Manage
        <span aria-hidden="true" className="text-xs">
          {open ? "▴" : "▾"}
        </span>
      </button>
      <div
        id={panelId}
        role="group"
        aria-label="Manage this game"
        hidden={!open}
        className="bg-raised rounded-card shadow-lift absolute top-full right-0 z-30 mt-2 flex w-64 max-w-[calc(100vw-2rem)] flex-col p-1"
      >
        <CloseMenu.Provider value={close}>{children}</CloseMenu.Provider>
      </div>
    </div>
  );
}
