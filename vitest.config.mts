import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests only. Integration tests need local Supabase, see vitest.integration.config.mts.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
