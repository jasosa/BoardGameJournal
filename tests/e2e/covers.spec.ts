import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import {
  createAccount,
  deleteAccount,
  resetLibrary,
} from "../support/accounts";
import { accountFor, accountKey, storageStatePath } from "./accounts";
import { addGame } from "./helpers";

// This file has its own signed-in account per project (see game-page.spec.ts for why).
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }, testInfo) => {
  const key = accountKey(testInfo.project.name, "cover");
  const state = JSON.parse(readFileSync(storageStatePath(key), "utf8")) as {
    cookies: Parameters<typeof context.addCookies>[0];
  };
  await context.clearCookies();
  await context.addCookies(state.cookies);
  await resetLibrary(accountFor(testInfo.project.name, "cover").id);
});

const picture = (r: number, width = 800, height = 1000) =>
  sharp({
    create: { width, height, channels: 3, background: { r, g: 80, b: 60 } },
  })
    .png()
    .toBuffer();

const file = (buffer: Buffer, name = "box.png", mimeType = "image/png") => ({
  name,
  mimeType,
  buffer,
});

async function openGame(page: Page, title: string) {
  await addGame(page, title);
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/);
}

/** True when an image element finished loading and has pixels. */
const loaded = (page: Page, selector: string) =>
  page
    .locator(selector)
    .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);

test("a cover shows on the game page and on the Library card", async ({
  page,
}) => {
  await openGame(page, "Wingspan");
  await expect(page.getByRole("button", { name: "Remove cover" })).toHaveCount(
    0,
  );
  // No cover, no colour: the page stays neutral.
  await expect(page.locator("[style*='--game-tint']")).toHaveCount(0);

  await page
    .locator('input[type="file"]')
    .setInputFiles(file(await picture(200)));
  const cover = page.getByRole("img", { name: "Cover of Wingspan" });
  await expect(cover).toBeVisible();
  await expect
    .poll(() => loaded(page, 'img[alt="Cover of Wingspan"]'))
    .toBe(true);
  await expect(page.getByText("Replace cover")).toBeVisible();
  // The page takes its tint and glow from the cover.
  await page.reload();
  const tinted = page.locator("[style*='--game-tint']");
  await expect(tinted).toHaveCount(1);
  const style = (await tinted.getAttribute("style")) ?? "";
  expect(style).toMatch(/--game-tint:\s*#[0-9a-f]{6}/);
  expect(style).toMatch(/--game-glow:\s*#[0-9a-f]{6}/);

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);

  await page.goto("/library");
  const card = page.getByRole("link", { name: /Wingspan/ });
  const thumb = card.locator("img");
  await expect(thumb).toHaveAttribute("src", /\/covers\/.+size=thumb/);
  await expect.poll(() => loaded(page, 'a[href^="/games/"] img')).toBe(true);
  const box = await thumb.boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(0.75, 1);
});

test("the cover is served privately, resized, and without photo metadata", async ({
  page,
}) => {
  await openGame(page, "Heat");
  // A phone-style photo that carries a place name and GPS tags.
  const photo = await sharp({
    create: {
      width: 2400,
      height: 1800,
      channels: 3,
      background: { r: 90, g: 90, b: 160 },
    },
  })
    .jpeg()
    .withExif({
      IFD0: { ImageDescription: "my secret home address" },
      IFD3: { GPSLatitudeRef: "N", GPSLongitudeRef: "E" },
    })
    .toBuffer();
  await page
    .locator('input[type="file"]')
    .setInputFiles(file(photo, "photo.jpg", "image/jpeg"));
  const cover = page.getByRole("img", { name: "Cover of Heat" });
  await expect(cover).toBeVisible();

  const src = (await cover.getAttribute("src"))!;
  const response = await page.request.get(src);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/webp");
  expect(response.headers()["cache-control"]).toContain("private");
  expect(response.headers()["cache-control"]).toContain("immutable");

  const bytes = await response.body();
  const meta = await sharp(bytes).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(["webp", 900, 1200]);
  expect(meta.exif).toBeUndefined();
  expect(bytes.includes(Buffer.from("my secret home address"))).toBe(false);

  const etag = response.headers()["etag"]!;
  const again = await page.request.get(src, {
    headers: { "If-None-Match": etag },
  });
  expect(again.status()).toBe(304);
});

test("replacing shows the new cover at once, and removing brings the placeholder back", async ({
  page,
}) => {
  await openGame(page, "Cascadia");
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(file(await picture(40)));
  const cover = page.getByRole("img", { name: "Cover of Cascadia" });
  await expect(cover).toBeVisible();
  const first = await cover.getAttribute("src");

  await input.setInputFiles(file(await picture(220)));
  await expect.poll(async () => cover.getAttribute("src")).not.toBe(first);
  await expect
    .poll(() => loaded(page, 'img[alt="Cover of Cascadia"]'))
    .toBe(true);

  await page.getByRole("button", { name: "Remove cover" }).click();
  await expect(cover).toHaveCount(0);
  await expect(page.getByText("Add cover")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove cover" })).toHaveCount(
    0,
  );

  await page.goto("/library");
  await expect(
    page.getByRole("link", { name: /Cascadia/ }).locator("img"),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Cascadia" })).toBeVisible();
});

test("files that are not usable images show a clear error and change nothing", async ({
  page,
}) => {
  await openGame(page, "Wingspan");
  const input = page.locator('input[type="file"]');
  const alert = page.locator("main [role=alert]");

  await input.setInputFiles(
    file(Buffer.from("this is not a picture"), "notes.png", "image/png"),
  );
  await expect(alert).toHaveText("Use a JPEG, PNG or WebP image.");

  await input.setInputFiles(
    file(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
      ),
      "logo.svg",
      "image/svg+xml",
    ),
  );
  await expect(alert).toHaveText("Use a JPEG, PNG or WebP image.");

  await input.setInputFiles(
    file(Buffer.alloc(10_600_000, 1), "huge.png", "image/png"),
  );
  await expect(alert).toHaveText("That image is larger than 10 MB.");

  await expect(page.getByRole("img", { name: /Cover of/ })).toHaveCount(0);
  await expect(page.getByText("Add cover")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Wingspan" }),
  ).toBeVisible();
});

test("nobody else can fetch my cover, and signed-out requests are sent to sign in", async ({
  page,
  browser,
  baseURL,
}) => {
  await openGame(page, "Private to me");
  await page
    .locator('input[type="file"]')
    .setInputFiles(file(await picture(120)));
  const cover = page.getByRole("img", { name: "Cover of Private to me" });
  await expect(cover).toBeVisible();
  const src = (await cover.getAttribute("src"))!;

  // Signed out: the proxy sends the request to the login page.
  const anonymous = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const anonResponse = await anonymous.request.get(`${baseURL}${src}`);
  expect(anonResponse.url()).toMatch(/\/login$/);
  expect(anonResponse.headers()["content-type"]).not.toContain("image/webp");
  await anonymous.close();

  // Another signed-in account gets nothing.
  const other = await createAccount("cover-other");
  try {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const otherPage = await context.newPage();
    await otherPage.goto(`${baseURL}/login`);
    await otherPage.getByLabel("Email").fill(other.email);
    await otherPage.getByLabel("Password").fill(other.password);
    await otherPage.getByRole("button", { name: "Sign in" }).click();
    await otherPage.waitForURL(`${baseURL}/`);
    const stolen = await otherPage.request.get(`${baseURL}${src}`);
    expect(stolen.status()).toBe(404);
    await context.close();
  } finally {
    await deleteAccount(other.id);
  }

  // Made-up ids and sizes are plain 404s.
  const id = src.split("/")[2]!.split("?")[0]!;
  for (const path of [
    "/covers/not-a-uuid",
    "/covers/00000000-0000-4000-8000-000000000000",
    `/covers/${id}?size=huge`,
  ]) {
    expect((await page.request.get(path)).status()).toBe(404);
  }
});

test("a large photo just under the limit uploads", async ({ page }) => {
  await openGame(page, "Big photo");
  // Noise does not compress, so this PNG is about 9.5 MB: a realistic large photo, under the 10 MB limit.
  const big = await sharp({
    create: {
      width: 1800,
      height: 1800,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
      noise: { type: "gaussian", mean: 128, sigma: 60 },
    },
  })
    .png()
    .toBuffer();
  expect(big.length).toBeGreaterThan(8_000_000);
  expect(big.length).toBeLessThan(10 * 1024 * 1024);

  await page.locator('input[type="file"]').setInputFiles(file(big));
  await expect(
    page.getByRole("img", { name: "Cover of Big photo" }),
  ).toBeVisible({
    timeout: 20_000,
  });
});
