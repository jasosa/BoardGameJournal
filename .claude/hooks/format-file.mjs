// PostToolUse: format the edited file with Prettier if the project has it. Silent no-op otherwise.
import { readInput, norm } from "./_read-input.mjs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const input = await readInput();
const file = input.tool_input?.file_path;
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
if (!file || !/\.(ts|tsx|js|jsx|mjs|cjs|json|css|md|mdx)$/.test(norm(file))) process.exit(0);

const bin = join(root, "node_modules", ".bin", process.platform === "win32" ? "prettier.cmd" : "prettier");
if (!existsSync(bin)) process.exit(0);

spawnSync(bin, ["--write", "--log-level", "warn", file], { stdio: "ignore", shell: process.platform === "win32" });
process.exit(0);
