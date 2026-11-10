"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  countItems,
  exportFileName,
  formatBytes,
  type Counts,
} from "@/features/export/format";

type State =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "done"; name: string; size: string }
  | { kind: "failed" };

const INCLUDED = [
  "The games you added, with their facts: year, players, play time, description",
  "Every copy, archived ones too, with its status history",
  "Every rating, with its date",
  "Every thought, with its topics and date",
];

const NOT_INCLUDED = [
  "Cover images. The file notes which games had one.",
  "Thought drafts you never saved. They stay on this device.",
];

/** The Export block of the Your data section. */
export function ExportBlock({
  counts,
  empty,
}: {
  counts: Counts;
  empty: boolean;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const items = countItems(counts);

  async function download() {
    if (state.kind === "pending") return;
    setState({ kind: "pending" });
    try {
      const response = await fetch("/settings/export", {
        cache: "no-store",
        credentials: "same-origin",
      });
      // A session that ended can redirect to the login page. That is not a file.
      const isJson = (response.headers.get("content-type") ?? "").includes(
        "application/json",
      );
      if (!response.ok || response.redirected || !isJson) {
        throw new Error("export failed");
      }
      const blob = await response.blob();
      const name = exportFileName(new Date());
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState({ kind: "done", name, size: formatBytes(blob.size) });
    } catch {
      setState({ kind: "failed" });
    }
    // The button keeps focus the whole time (it is aria-disabled, never disabled).
    buttonRef.current?.focus();
  }

  const pending = state.kind === "pending";

  return (
    <div>
      <h3 className="mb-1.5 text-lg font-semibold">Export</h3>
      {empty ? (
        <p className="text-ink-soft max-w-prose">
          Nothing to export yet. Once you add a game, a rating or a thought, you
          can download it here.
        </p>
      ) : (
        <>
          <p className="text-ink-soft mb-2 max-w-prose">
            Download a copy of everything you have recorded, as one JSON file.
          </p>
          <p className="text-ink flex flex-wrap text-sm tabular-nums">
            {items.map((item, index) => (
              <span key={item} className="whitespace-nowrap">
                {item}
                {index < items.length - 1 ? (
                  <span aria-hidden="true" className="text-ink-faint mx-2.5">
                    ·
                  </span>
                ) : null}
              </span>
            ))}
          </p>
          <details className="group">
            <summary className="text-ink-soft hover:text-ink rounded-input focus-visible:outline-accent mt-1 inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden="true"
                className="text-ink-faint duration-fast inline-block w-2.5 transition-transform group-open:rotate-90"
              >
                ›
              </span>
              What is in the file
            </summary>
            <div className="text-ink-soft max-w-prose pb-2 pl-4.5 text-sm">
              <p className="text-ink mt-1 mb-0.5 font-medium">Included</p>
              <ul className="mb-2 list-disc pl-4.5 leading-relaxed">
                {INCLUDED.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="text-ink mb-0.5 font-medium">Not included</p>
              <ul className="list-disc pl-4.5 leading-relaxed">
                {NOT_INCLUDED.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </details>
          <div className="mt-2">
            <Button
              ref={buttonRef}
              type="button"
              aria-disabled={pending}
              className="aria-disabled:hover:bg-accent aria-disabled:cursor-default aria-disabled:opacity-60"
              onClick={download}
            >
              {pending ? "Preparing your file" : "Download export"}
            </Button>
          </div>
          <p
            role="status"
            className={`text-ink-soft text-sm break-words ${state.kind === "done" ? "mt-2.5" : ""}`}
          >
            {state.kind === "done" ? (
              <>
                Download started:{" "}
                <span className="text-ink font-medium">{state.name}</span>,{" "}
                {state.size}.
              </>
            ) : null}
          </p>
          {state.kind === "failed" ? (
            <p role="alert" className="text-negative text-sm">
              Could not prepare your export. Nothing was downloaded. Try again.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
