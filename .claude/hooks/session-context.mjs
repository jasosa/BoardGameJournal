// SessionStart: give Claude the "Now / Next" part of docs/STATUS.md and the git state.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const out = [];
const status = join(root, "docs", "STATUS.md");
if (existsSync(status)) {
  const text = readFileSync(status, "utf8");
  const start = text.indexOf("## Now");
  const end = text.indexOf("## Done");
  out.push("Project status (docs/STATUS.md excerpt):\n" + (start >= 0 ? text.slice(start, end > start ? end : undefined) : text.slice(0, 2500)).trim());
}
const git = spawnSync("git", ["status", "--short", "--branch"], { cwd: root, encoding: "utf8" });
if (git.status === 0) out.push("Git:\n" + git.stdout.trim().split("\n").slice(0, 20).join("\n"));
process.stdout.write(out.join("\n\n") + "\n");
process.exit(0);
