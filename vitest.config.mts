import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests only. Integration tests need local Supabase, see vitest.integration.config.mts.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.ts"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/support/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
