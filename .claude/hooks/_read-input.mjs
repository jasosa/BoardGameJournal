// Shared helper: read the hook JSON payload from stdin.
export async function readInput() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// Exit code 2 blocks the tool call and sends the message back to Claude.
export function block(message) {
  process.stderr.write(message + "\n");
  process.exit(2);
}

export function norm(p) {
  return String(p || "").replace(/\\/g, "/");
}
