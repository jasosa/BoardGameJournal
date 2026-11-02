import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Needs `npx supabase start`. Connection values come from the environment.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    passWithNoTests: true,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/support/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
