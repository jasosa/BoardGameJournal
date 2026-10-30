// PreToolUse guard for Bash. Blocks commands that can leak secrets or destroy data.
import { readInput, block } from "./_read-input.mjs";

const input = await readInput();
const cmd = String(input.tool_input?.command || "");

const rules = [
  [/\b(cat|type|more|less|head|tail|bat|Get-Content)\b[^|]*\.env(?!\.example)\b/i, "Do not print .env files. Use .env.example for names."],
  [/\b(printenv|env)\b\s*($|\|)/, "Do not dump the environment; it can contain secrets."],
  [/git\s+push\s+.*(--force|-f)\b/, "Force push is not allowed."],
  [/supabase\s+db\s+reset\s+.*--linked/, "Never reset the linked (remote) database."],
  [/\bdrop\s+(database|schema)\b/i, "DROP DATABASE/SCHEMA is not allowed from Claude."],
  [/git\s+add\s+.*\.env(?!\.example)\b/, "Do not stage .env files."],
];

for (const [re, msg] of rules) {
  if (re.test(cmd)) block("Blocked: " + msg);
}
process.exit(0);
