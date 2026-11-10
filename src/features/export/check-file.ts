import { formatBytes, plural } from "./format";
import { describeProblems, type Problems } from "./problems";
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  IMPORT_MAX_BYTES,
  exportFileSchema,
  type ExportFile,
} from "./schemas";
import { summarizeFile, type FileSummary } from "./summary";

/** The result of checking a chosen file on the device, in the order of the contract. */
export type FileCheck =
  | { kind: "too_large"; size: number }
  | { kind: "not_export" }
  | { kind: "newer"; version: number }
  | { kind: "problems"; problems: Problems }
  | { kind: "no_games" }
  | { kind: "ok"; file: ExportFile; summary: FileSummary };

/**
 * Checks a file's size and text. Size first (without reading the file), then JSON, format,
 * version, content and finally whether there is anything to import.
 */
export function checkExportFile(size: number, text: string | null): FileCheck {
  if (size > IMPORT_MAX_BYTES) return { kind: "too_large", size };
  if (text === null) return { kind: "not_export" };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { kind: "not_export" };
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { kind: "not_export" };
  }
  const head = raw as Record<string, unknown>;
  if (head.format !== EXPORT_FORMAT) return { kind: "not_export" };

  const version = head.version;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    return { kind: "not_export" };
  }
  if (version > EXPORT_VERSION) return { kind: "newer", version };
  if (version !== EXPORT_VERSION) return { kind: "not_export" };

  const parsed = exportFileSchema.safeParse(raw);
  if (!parsed.success) {
    return { kind: "problems", problems: describeProblems(parsed.error, raw) };
  }
  if (parsed.data.games.length === 0) return { kind: "no_games" };
  return {
    kind: "ok",
    file: parsed.data,
    summary: summarizeFile(parsed.data),
  };
}

const CHOOSE = "Choose the .json file that Export downloaded.";

/** The headline of a refused file. `problems` also gets a list and a hint under it. */
export function fileMessage(
  check: Exclude<FileCheck, { kind: "ok" }>,
  fileName: string,
): string {
  switch (check.kind) {
    case "too_large":
      return `“${fileName}” is ${formatBytes(check.size)}, and the limit is 10 MB. ${CHOOSE}`;
    case "not_export":
      return `“${fileName}” is not a Meeple Journal export. ${CHOOSE}`;
    case "newer":
      return `“${fileName}” was made by a newer version of Meeple Journal (format ${check.version}). This version reads format 1 only.`;
    case "no_games":
      return `“${fileName}” has no games in it, so there is nothing to import.`;
    case "problems":
      return `“${fileName}” has ${plural(check.problems.total, "problem", "problems")}, so nothing can be imported:`;
  }
}

export const PROBLEMS_HINT =
  "If the file was edited by hand, fix these and choose it again.";
