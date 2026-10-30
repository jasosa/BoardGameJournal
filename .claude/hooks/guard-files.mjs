// PreToolUse guard for Edit/Write/MultiEdit.
// 1. Never write real env files (only .env.example).
// 2. Never put the Supabase service role key in client-reachable code.
// 3. Never edit a committed migration in place (create a new one).
import { readInput, block, norm } from "./_read-input.mjs";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const input = await readInput();
const ti = input.tool_input || {};
const file = norm(ti.file_path);
const name = file.split("/").pop() || "";

if (/^\.env(\..+)?$/.test(name) && name !== ".env.example") {
  block(`Blocked: do not write ${name}. Put variable names in .env.example and ask the user to fill real values.`);
}

const text = [ti.content, ti.new_string, ...(ti.edits || []).map((e) => e.new_string)]
  .filter(Boolean)
  .join("\n");

const clientReachable =
  /\/src\/(components|app)\//.test(file) && !/\/src\/app\/api\//.test(file) && !/\.server\.(ts|tsx)$/.test(file);
const usesServiceRole = /SERVICE_ROLE|service_role/i.test(text);
if (clientReachable && usesServiceRole) {
  block(
    "Blocked: service role key referenced in client-reachable code (src/components or src/app). " +
      "Move privileged access into src/server/** with `import \"server-only\"`."
  );
}

if (/NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE/.test(text)) {
  block("Blocked: a service role key must never be NEXT_PUBLIC_.");
}

// Changing a migration that is already committed: block, so Claude creates a new migration instead.
// Uncommitted migrations (still being written) can be edited freely.
if (/\/supabase\/migrations\/.+\.sql$/.test(file) && existsSync(ti.file_path)) {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const r = spawnSync("git", ["log", "-1", "--format=%h", "--", ti.file_path], { cwd: root, encoding: "utf8" });
  if (r.status === 0 && r.stdout.trim()) {
    block(
      "Blocked: this migration is already committed. Create a new one with `npx supabase migration new <name>`."
    );
  }
}

process.exit(0);
