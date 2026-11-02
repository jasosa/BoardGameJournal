import { defineConfig, devices } from "@playwright/test";
import { storageStatePath } from "./tests/e2e/accounts";
import { readLocalSupabase } from "./tests/support/supabase-env";

// The e2e suite needs the local Supabase stack (`npx supabase start`).
const supabase = readLocalSupabase();

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        storageState: storageStatePath("desktop"),
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        storageState: storageStatePath("mobile"),
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    // Public values only. The service role key never reaches the app.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabase.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
    },
  },
});
