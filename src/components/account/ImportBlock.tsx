"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { importAccountAction } from "@/app/(app)/settings/data-actions";
import { Button } from "@/components/ui/Button";
import {
  PROBLEMS_HINT,
  checkExportFile,
  fileMessage,
  type FileCheck,
} from "@/features/export/check-file";
import {
  formatBytes,
  formatCount,
  formatLocalDay,
  importResultSentence,
  type Counts,
} from "@/features/export/format";
import { IMPORT_MAX_BYTES } from "@/features/export/schemas";
import type { FileSummary } from "@/features/export/summary";

type Refused = Exclude<FileCheck, { kind: "ok" }>;

type Ready = {
  name: string;
  size: number;
  text: string;
  summary: FileSummary;
  exportedAt: string;
};

type Stage =
  | { kind: "idle" }
  | { kind: "checking"; name: string }
  | { kind: "refused"; name: string; check: Refused }
  | ({ kind: "ready" } & Ready)
  | ({ kind: "importing" } & Ready)
  | ({ kind: "failed"; message: string } & Ready)
  | ({ kind: "not_empty"; message: string } & Ready)
  | { kind: "done"; counts: Counts; covers: number };

const LEAD =
  "Put an export back into this account. Import works only into an empty account, so it never mixes with or overwrites what you have.";
const BLOCKED =
  "This account already has games, ratings or thoughts, so import is not available here. To put a file back, use a new, empty account.";

const quietBase =
  "border-edge text-ink rounded-input duration-fast inline-flex min-h-11 items-center justify-center border px-4 text-sm font-medium transition-[border-color]";
const quietLink = `${quietBase} hover:border-accent`;

/** The Import block of the Your data section. */
export function ImportBlock({ empty }: { empty: boolean }) {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  // After "account no longer empty" the screen behaves as a non-empty account even before the
  // page data has refreshed.
  const [blocked, setBlocked] = useState(false);
  const [announce, setAnnounce] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const importHeadingRef = useRef<HTMLHeadingElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const latest = useRef(0);

  const kind = stage.kind;
  const busy = kind === "checking" || kind === "importing";
  // The file button is also off once the server said the account is no longer empty.
  const locked = busy || kind === "not_empty";

  // Focus moves to the panel heading when the panel opens and to the result when it ends.
  useEffect(() => {
    if (kind === "ready" || kind === "done") headingRef.current?.focus();
    if (kind === "not_empty") cancelRef.current?.focus();
  }, [kind]);

  // While importing, the browser asks before the page is left.
  useEffect(() => {
    if (kind !== "importing") return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [kind]);

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires a change.
    event.target.value = "";
    if (!file || busy) return;

    const run = ++latest.current;
    setStage({ kind: "checking", name: file.name });
    setAnnounce("Checking your file");

    let text: string | null = null;
    if (file.size <= IMPORT_MAX_BYTES) {
      try {
        text = await file.text();
      } catch {
        text = null;
      }
    }
    if (run !== latest.current) return;

    const check = checkExportFile(file.size, text);
    setAnnounce("");
    if (check.kind !== "ok") {
      setStage({ kind: "refused", name: file.name, check });
      return;
    }
    setStage({
      kind: "ready",
      name: file.name,
      size: file.size,
      text: text ?? "",
      summary: check.summary,
      exportedAt: check.file.exported_at,
    });
  }

  function cancel() {
    if (busy) return;
    if (kind === "not_empty") {
      setBlocked(true);
      setStage({ kind: "idle" });
      // The section now reads as an account with data: focus the Import heading.
      window.setTimeout(() => importHeadingRef.current?.focus(), 0);
      return;
    }
    latest.current += 1;
    setStage({ kind: "idle" });
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function runImport() {
    if (stage.kind !== "ready" && stage.kind !== "failed") return;
    const { name, size, text, summary, exportedAt } = stage;
    const ready: Ready = { name, size, text, summary, exportedAt };
    setStage({ kind: "importing", ...ready });
    setAnnounce("Importing");
    try {
      const result = await importAccountAction(text);
      setAnnounce("");
      if (result.ok) {
        setStage({
          kind: "done",
          counts: result.counts,
          covers: summary.covers,
        });
      } else if (result.code === "not_empty") {
        setStage({ kind: "not_empty", message: result.message, ...ready });
      } else {
        setStage({ kind: "failed", message: result.message, ...ready });
      }
    } catch {
      setAnnounce("");
      setStage({
        kind: "failed",
        message:
          "The import did not finish, and nothing was saved. Your file is fine. Try again.",
        ...ready,
      });
    }
  }

  const notAvailable = !empty || blocked;
  const showFileControl = kind !== "done" && !notAvailable;
  const panel =
    kind === "ready" ||
    kind === "importing" ||
    kind === "failed" ||
    kind === "not_empty"
      ? stage
      : null;

  return (
    <div>
      <h3
        ref={importHeadingRef}
        tabIndex={-1}
        className="mb-1.5 text-lg font-semibold focus:outline-none"
      >
        Import
      </h3>

      {kind === "done" ? null : (
        <p className="text-ink-soft mb-2 max-w-prose">{LEAD}</p>
      )}

      {notAvailable && kind !== "done" ? (
        <p className="text-ink max-w-prose">{BLOCKED}</p>
      ) : null}

      {showFileControl ? (
        <div>
          <input
            ref={inputRef}
            id="import-file"
            type="file"
            accept=".json,application/json"
            aria-describedby="import-file-hint"
            aria-disabled={locked}
            className="peer sr-only"
            onClick={(event) => {
              if (locked) event.preventDefault();
            }}
            onChange={choose}
          />
          <label
            htmlFor="import-file"
            className={`${quietBase} peer-focus-visible:outline-accent peer-focus-visible:outline-2 cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${
              locked ? "cursor-default opacity-60" : "hover:border-accent"
            }`}
          >
            {kind === "idle" ? "Choose a file" : "Choose another file"}
          </label>
          <p id="import-file-hint" className="text-ink-soft mt-1.5 text-sm">
            A .json file made by Export, up to 10 MB.
          </p>
          {kind === "checking" ? (
            <p className="text-ink-soft mt-2.5 text-sm break-words">
              Checking <span className="text-ink">{stage.name}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <p role="status" className="sr-only">
        {announce}
      </p>

      {kind === "refused" ? <RefusedMessage stage={stage} /> : null}

      {panel ? (
        <section
          aria-labelledby="import-ready-heading"
          className="bg-raised rounded-card mt-3 p-4 max-md:-mx-2 max-md:p-3"
        >
          <h4
            id="import-ready-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mb-0.5 text-panel leading-tight font-semibold focus:outline-none"
          >
            Ready to import
          </h4>
          <p className="text-ink-soft mb-3.5 text-sm break-words">
            <span className="text-ink font-medium">{panel.name}</span>
            <br />
            {formatBytes(panel.size)} · exported{" "}
            {formatLocalDay(panel.exportedAt)}
          </p>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm tabular-nums">
            <Row term="Games" value={formatCount(panel.summary.games)} />
            <Row
              term="Copies"
              value={
                panel.summary.archived > 0
                  ? `${formatCount(panel.summary.copies)}, ${formatCount(panel.summary.archived)} of them archived`
                  : formatCount(panel.summary.copies)
              }
            />
            <Row
              term="Status changes"
              value={formatCount(panel.summary.changes)}
            />
            <Row term="Ratings" value={formatCount(panel.summary.ratings)} />
            <Row term="Thoughts" value={formatCount(panel.summary.thoughts)} />
          </dl>
          {panel.summary.covers > 0 ? (
            <p className="text-ink-soft mt-3.5 max-w-prose text-sm">
              {panel.summary.covers === 1
                ? "Covers are not in the file. 1 of these games had a cover; it arrives with its initial, and you can add the cover again on the game page."
                : `Covers are not in the file. ${formatCount(panel.summary.covers)} of these games had a cover; they arrive with their initial, and you can add the cover again on the game page.`}
            </p>
          ) : null}
          {kind === "importing" ? (
            <p className="text-ink mt-3.5 text-sm">
              {panel.summary.games === 1
                ? "Importing 1 game with its history, ratings and thoughts. This can take a minute. Keep this page open."
                : `Importing ${formatCount(panel.summary.games)} games with their history, ratings and thoughts. This can take a minute. Keep this page open.`}
            </p>
          ) : null}
          {kind === "failed" || kind === "not_empty" ? (
            <p role="alert" className="text-negative mt-3.5 text-sm">
              {stage.message}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              ref={cancelRef}
              type="button"
              variant="quiet"
              aria-disabled={busy}
              className="aria-disabled:hover:border-edge aria-disabled:cursor-default aria-disabled:opacity-60"
              onClick={cancel}
            >
              Cancel
            </Button>
            {kind === "not_empty" ? null : (
              <Button
                type="button"
                aria-disabled={kind === "importing"}
                className="aria-disabled:hover:bg-accent aria-disabled:cursor-default aria-disabled:opacity-60"
                onClick={runImport}
              >
                {kind === "importing" ? "Importing" : "Import"}
              </Button>
            )}
          </div>
        </section>
      ) : null}

      {stage.kind === "done" ? (
        <section
          role="status"
          aria-labelledby="import-ready-heading"
          className="bg-raised rounded-card mt-3 p-4 max-md:-mx-2 max-md:p-3"
        >
          <h4
            id="import-ready-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mb-1.5 text-panel leading-tight font-semibold focus:outline-none"
          >
            Import complete
          </h4>
          <p className="text-ink max-w-prose text-sm">
            {importResultSentence(stage.counts)}
          </p>
          {stage.covers > 0 ? (
            <p className="text-ink-soft mt-2.5 max-w-prose text-sm">
              {formatCount(stage.covers)} of these games had a cover. Add their
              covers again on each game page.
            </p>
          ) : null}
          <div className="mt-4">
            <Link href="/library" className={quietLink}>
              Open your Library
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <>
      <dt className="text-ink-soft">{term}</dt>
      <dd className="text-ink">{value}</dd>
    </>
  );
}

function RefusedMessage({
  stage,
}: {
  stage: { name: string; check: Refused };
}) {
  const { check, name } = stage;
  return (
    <div role="alert" className="mt-2.5 text-sm break-words">
      <p className="text-negative">{fileMessage(check, name)}</p>
      {check.kind === "problems" ? (
        <>
          <ul className="text-ink mt-2 list-disc pl-4.5 leading-relaxed">
            {check.problems.shown.map((line, index) => (
              <li key={index} className="mb-1">
                {line}
              </li>
            ))}
          </ul>
          {check.problems.more > 0 ? (
            <p className="text-ink mt-1">
              and {formatCount(check.problems.more)} more.
            </p>
          ) : null}
          <p className="text-ink-soft mt-2">{PROBLEMS_HINT}</p>
        </>
      ) : null}
    </div>
  );
}
