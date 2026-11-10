import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { adminClient, resetLibrary } from "../support/accounts";
import { accountFor, accountKey, storageStatePath } from "./accounts";
import { addGame } from "./helpers";

// Own account per project, so this file can change the library while other specs run.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }, testInfo) => {
  const key = accountKey(testInfo.project.name, "data");
  const state = JSON.parse(readFileSync(storageStatePath(key), "utf8")) as {
    cookies: Parameters<typeof context.addCookies>[0];
  };
  await context.clearCookies();
  await context.addCookies(state.cookies);
  await resetLibrary(accountFor(testInfo.project.name, "data").id);
});

const section = (page: Page) => page.getByRole("region", { name: "Your data" });
const fileInput = (page: Page) => page.getByLabel(/^Choose (a|another) file$/);

function exportFile(games: unknown[]) {
  return {
    format: "meeple-journal-export",
    version: 1,
    exported_at: "2026-11-10T17:42:07Z",
    games,
  };
}

const day = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

function oneGame(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    year: 2019,
    min_players: 1,
    max_players: 5,
    play_time_min: 70,
    description: null,
    kind: "base",
    source: "manual",
    created_at: "2026-01-01T10:00:00+00:00",
    cover: { path: "x/y/z/cover.webp" },
    copies: [
      {
        status: "owned",
        archived_at: null,
        acquired_on: null,
        sold_on: null,
        price: null,
        currency: null,
        source: null,
        notes: null,
        created_at: "2026-01-01T10:00:00+00:00",
        history: [
          {
            from_status: null,
            to_status: "owned",
            changed_on: day(100),
            recorded_at: "2026-01-01T10:00:00+00:00",
          },
        ],
      },
    ],
    ratings: [
      {
        overall: 8.5,
        assessed_on: day(50),
        created_at: "2026-02-01T10:00:00+00:00",
      },
    ],
    thoughts: [
      {
        body: "Imported thought.",
        topics: ["artwork"],
        written_on: day(40),
        created_at: "2026-02-02T10:00:00+00:00",
        updated_at: "2026-02-02T10:00:00+00:00",
      },
    ],
    ...extra,
  };
}

async function upload(page: Page, name: string, body: string | Buffer) {
  // A file set before the page has hydrated would be lost, so let the page settle first.
  await page.waitForLoadState("networkidle");
  await fileInput(page).setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.isBuffer(body) ? body : Buffer.from(body),
  });
}

test("an empty account says there is nothing to export and offers the file picker", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(section(page)).toBeVisible();
  await expect(
    section(page).getByText("Nothing to export yet.", { exact: false }),
  ).toBeVisible();
  await expect(
    section(page).getByRole("button", { name: "Download export" }),
  ).toHaveCount(0);
  await expect(
    section(page).getByText("A .json file made by Export, up to 10 MB."),
  ).toBeVisible();
  await expect(fileInput(page)).toHaveCount(1);
});

test("an account with data shows counts, the disclosure, a download and no import", async ({
  page,
}) => {
  await addGame(page, "Wingspan", "Owned");
  await page.goto("/settings");

  await expect(section(page).getByText("1 game")).toBeVisible();
  await expect(section(page).getByText("1 copy")).toBeVisible();
  await expect(section(page).getByText("1 status change")).toBeVisible();

  const summary = section(page).getByText("What is in the file");
  await expect(
    section(page).getByText("Every rating, with its date"),
  ).toBeHidden();
  await summary.click();
  await expect(
    section(page).getByText("Every rating, with its date"),
  ).toBeVisible();
  await expect(section(page).getByText("Cover images.")).toBeVisible();

  await expect(
    section(page).getByText(
      "This account already has games, ratings or thoughts, so import is not available here.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(fileInput(page)).toHaveCount(0);

  const downloadPromise = page.waitForEvent("download");
  await section(page).getByRole("button", { name: "Download export" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^meeple-journal-\d{4}-\d{2}-\d{2}\.json$/,
  );
  await expect(
    section(page).getByText("Download started:", { exact: false }),
  ).toBeVisible();
  const path = await download.path();
  const file = JSON.parse(readFileSync(path, "utf8"));
  expect(file.format).toBe("meeple-journal-export");
  expect(file.games.map((g: { name: string }) => g.name)).toEqual(["Wingspan"]);
  await expect(
    section(page).getByRole("button", { name: "Download export" }),
  ).toBeFocused();
});

test("a failed export says nothing was downloaded", async ({ page }) => {
  await addGame(page, "Root");
  await page.goto("/settings");
  await page.route("**/settings/export", (route) =>
    route.fulfill({ status: 500, body: "{}" }),
  );
  await section(page).getByRole("button", { name: "Download export" }).click();
  await expect(
    section(page).getByRole("alert").filter({ hasText: "Could not prepare" }),
  ).toHaveText(
    "Could not prepare your export. Nothing was downloaded. Try again.",
  );
  await expect(
    section(page).getByRole("button", { name: "Download export" }),
  ).toBeFocused();
});

test("each refused file gets its own message and keeps focus on the file button", async ({
  page,
}) => {
  await page.goto("/settings");

  // A real person clicks the label first, which focuses the input.
  await fileInput(page).focus();
  await upload(page, "notes.json", "hello");
  const alert = section(page).getByRole("alert");
  await expect(alert).toHaveText(
    "“notes.json” is not a Meeple Journal export. Choose the .json file that Export downloaded.",
  );
  await expect(
    section(page).getByText("Choose another file", { exact: true }),
  ).toBeVisible();
  await expect(fileInput(page)).toBeFocused();

  await upload(
    page,
    "new.json",
    JSON.stringify({ format: "meeple-journal-export", version: 2 }),
  );
  await expect(alert).toHaveText(
    "“new.json” was made by a newer version of Meeple Journal (format 2). This version reads format 1 only.",
  );

  await upload(page, "empty.json", JSON.stringify(exportFile([])));
  await expect(alert).toHaveText(
    "“empty.json” has no games in it, so there is nothing to import.",
  );

  await upload(page, "big.json", Buffer.alloc(10 * 1024 * 1024 + 1, "a"));
  await expect(alert).toContainText(
    "“big.json” is 10.0 MB, and the limit is 10 MB.",
  );

  const bad = [
    oneGame("Wingspan", { year: 0 }),
    oneGame("", { year: 5000 }),
    oneGame("Root", { kind: "dlc" }),
    oneGame("Azul", { min_players: 9, max_players: 2 }),
    oneGame("Catan", { play_time_min: 0 }),
    oneGame("Dune", { year: 0 }),
  ];
  await upload(page, "bad.json", JSON.stringify(exportFile(bad)));
  await expect(alert).toContainText(
    "“bad.json” has 7 problems, so nothing can be imported:",
  );
  await expect(alert.getByRole("listitem")).toHaveCount(5);
  await expect(alert).toContainText(
    "Game “Wingspan”: the year is outside 1 to 2200.",
  );
  await expect(alert).toContainText("and 2 more.");
  await expect(alert).toContainText(
    "If the file was edited by hand, fix these and choose it again.",
  );
});

test("a good file opens the panel, Cancel closes it, Import saves everything", async ({
  page,
}) => {
  await page.goto("/settings");
  const file = JSON.stringify(exportFile([oneGame("Wingspan")]));

  await upload(page, "export.json", file);
  const panel = section(page).getByRole("region", { name: "Ready to import" });
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("heading", { name: "Ready to import" }),
  ).toBeFocused();
  await expect(panel.getByText("export.json")).toBeVisible();
  await expect(panel.getByText("exported 10 November 2026")).toBeVisible();
  await expect(panel.getByText("Status changes")).toBeVisible();
  await expect(
    panel.getByText(
      "Covers are not in the file. 1 of these games had a cover;",
      {
        exact: false,
      },
    ),
  ).toBeVisible();

  await panel.getByRole("button", { name: "Cancel" }).click();
  await expect(panel).toHaveCount(0);
  await expect(fileInput(page)).toBeFocused();
  await expect(
    section(page).getByText("Choose a file", { exact: true }),
  ).toBeVisible();

  await upload(page, "export.json", file);
  await panel.getByRole("button", { name: "Import" }).click();
  const done = section(page).getByRole("status").filter({
    hasText: "Import complete",
  });
  await expect(done).toBeVisible();
  await expect(
    done.getByRole("heading", { name: "Import complete" }),
  ).toBeFocused();
  await expect(done).toContainText(
    "This account now has 1 game, 1 copy, 1 status change, 1 rating and 1 thought.",
  );
  await expect(done).toContainText(
    "1 of these games had a cover. Add their covers again on each game page.",
  );

  // The Export block shows the new counts after the page data refreshes.
  await expect(section(page).getByText(/^1 rating/)).toBeVisible();
  await done.getByRole("link", { name: "Open your Library" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByText("Wingspan").first()).toBeVisible();

  await page.goto("/settings");
  await expect(
    section(page).getByText("import is not available here", { exact: false }),
  ).toBeVisible();
});

test("if something is added after the file was chosen, nothing is imported", async ({
  page,
}, testInfo) => {
  await page.goto("/settings");
  await upload(
    page,
    "export.json",
    JSON.stringify(exportFile([oneGame("Wingspan")])),
  );
  const panel = section(page).getByRole("region", { name: "Ready to import" });
  await expect(panel).toBeVisible();

  // Another tab adds a game in the meantime.
  const account = accountFor(testInfo.project.name, "data");
  const { error } = await adminClient()
    .from("games")
    .insert({ name: "Sneaky", source: "manual", created_by: account.id });
  expect(error).toBeNull();

  await panel.getByRole("button", { name: "Import" }).click();
  await expect(panel.getByRole("alert")).toHaveText(
    "Something was added to this account after you chose the file, so nothing was imported. Import works only into an empty account.",
  );
  await expect(
    panel.getByRole("button", { name: "Import", exact: true }),
  ).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Cancel" })).toBeFocused();
  // The file button is switched off while the account is known to have data.
  await expect(fileInput(page)).toHaveAttribute("aria-disabled", "true");

  await panel.getByRole("button", { name: "Cancel" }).click();
  await expect(
    section(page).getByText("import is not available here", { exact: false }),
  ).toBeVisible();
  await expect(
    section(page).getByRole("heading", { name: "Import" }),
  ).toBeFocused();
  await expect(fileInput(page)).toHaveCount(0);
});

test("a failed import says nothing was saved and keeps focus on Import", async ({
  page,
}) => {
  await page.goto("/settings");
  await upload(
    page,
    "export.json",
    JSON.stringify(exportFile([oneGame("Wingspan")])),
  );
  const panel = section(page).getByRole("region", { name: "Ready to import" });
  await expect(panel).toBeVisible();

  // The import goes to the page's own address as a server action, so fail every POST to it.
  await page.route("**/settings", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await panel.getByRole("button", { name: "Import" }).click();
  await expect(panel.getByRole("alert")).toHaveText(
    "The import did not finish, and nothing was saved. Your file is fine. Try again.",
  );
  await expect(panel.getByRole("button", { name: "Import" })).toBeFocused();
});

test("the section has no horizontal overflow and every control is 44px tall", async ({
  page,
}) => {
  await addGame(page, "Wingspan");
  await page.goto("/settings");
  await expect(
    section(page).getByRole("button", { name: "Download export" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  for (const control of [
    section(page).getByRole("button", { name: "Download export" }),
    section(page).getByText("What is in the file"),
  ]) {
    const box = await control.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(43.5);
  }
});

test("the export address refuses a request without a session", async ({
  playwright,
}) => {
  // An empty storage state, so the project's signed-in cookies are not used.
  const anonymous = await playwright.request.newContext({
    baseURL: "http://localhost:3000",
    storageState: { cookies: [], origins: [] },
  });
  const response = await anonymous.get("/settings/export", {
    maxRedirects: 0,
  });
  // Either the proxy sends the person to the login page, or the route answers 401. Never a file.
  expect([307, 308, 401]).toContain(response.status());
  expect(await response.text()).not.toContain("meeple-journal-export");
  await anonymous.dispose();
});
