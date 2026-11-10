// Gives every game without a cover a generated placeholder cover. For testing the wall and the
// game-page tint only: abstract shapes and the title, made here, with no third-party art.
//
// Usage:  npm run seed:covers -- you@example.com
//
// Signs in as that user and stores covers the way the app's upload does: two WebP files under
// <user>/<game>/<version>/ in the private "covers" bucket, plus a game_images row with the size
// and the two page colours. Shapes vary between 0.6 and 1.5 (width / height) so the masonry wall
// has something to lay out. Games that already have a cover are left alone, so it is safe to
// run twice. Local database only.
//
// The resize and thumbnail steps repeat src/server/images/process-cover.ts, which cannot be
// imported here (it is marked server-only). Keep them in step if that file changes.

import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
// Plain TypeScript, so Node can load them directly.
import {
  COVER_LONG_SIDE,
  coverDimensions,
  coverPaths,
} from "../src/features/catalogue/cover.ts";
import { deriveCoverColours } from "../src/features/catalogue/cover-colours.ts";
import { fail, signInAs } from "./lib/sign-in-as.mjs";

const email = process.argv[2]?.trim();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run seed:covers -- <email>");
  process.exit(1);
}

const { db, userId } = await signInAs(email);

/** Stable numbers from a title, so the same game always gets the same placeholder. */
function seedOf(title) {
  const bytes = createHash("sha256").update(title).digest();
  const at = (i) => bytes[i] / 255;
  return {
    hue: at(0) * 360,
    hue2: at(1) * 360,
    shape: at(2),
    kind: bytes[3] % 3,
  };
}

function escapeXml(text) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Breaks a title into at most four short lines. */
function wrapTitle(title) {
  const lines = [];
  let line = "";
  for (const word of title.split(/\s+/)) {
    if (line && (line + " " + word).length > 14) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > 4) {
    lines.length = 4;
    lines[3] = lines[3].slice(0, 12) + "...";
  }
  return lines;
}

/** One abstract SVG cover, 1000 on the long side. */
function placeholderSvg(title) {
  const s = seedOf(title);
  // Shapes from 0.6 (tall) to 1.5 (wide), like real boxes.
  const ratio = 0.6 + s.shape * 0.9;
  const width = ratio >= 1 ? 1000 : Math.round(1000 * ratio);
  const height = ratio >= 1 ? Math.round(1000 / ratio) : 1000;
  const c1 = `hsl(${s.hue.toFixed(0)} 55% 38%)`;
  const c2 = `hsl(${s.hue2.toFixed(0)} 60% 22%)`;
  const light = `hsl(${((s.hue + 40) % 360).toFixed(0)} 70% 70%)`;

  const shapes =
    s.kind === 0
      ? `<circle cx="${width * 0.7}" cy="${height * 0.3}" r="${Math.min(width, height) * 0.32}" fill="${light}" opacity="0.35"/>
         <circle cx="${width * 0.25}" cy="${height * 0.75}" r="${Math.min(width, height) * 0.22}" fill="${light}" opacity="0.2"/>`
      : s.kind === 1
        ? `<polygon points="0,${height} ${width * 0.6},${height * 0.35} ${width},${height}" fill="${light}" opacity="0.28"/>
           <polygon points="0,${height} ${width * 0.3},${height * 0.62} ${width * 0.55},${height}" fill="${light}" opacity="0.2"/>`
        : `<rect x="${width * 0.12}" y="${height * 0.1}" width="${width * 0.5}" height="${height * 0.5}" fill="${light}" opacity="0.28" transform="rotate(12 ${width / 2} ${height / 2})"/>
           <rect x="${width * 0.45}" y="${height * 0.4}" width="${width * 0.4}" height="${height * 0.4}" fill="${light}" opacity="0.2" transform="rotate(-8 ${width / 2} ${height / 2})"/>`;

  const lines = wrapTitle(title);
  const fontSize = Math.round(Math.min(width, height) * 0.1);
  const text = lines
    .map(
      (l, i) =>
        `<text x="${width / 2}" y="${height * 0.5 + (i - (lines.length - 1) / 2) * fontSize * 1.25}" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="#f4f1ea">${escapeXml(l)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    ${shapes}
    ${text}
    <text x="${width / 2}" y="${height - fontSize * 0.6}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(fontSize * 0.45)}" fill="#f4f1ea" opacity="0.6">TEST COVER</text>
  </svg>`;
}

/** Same steps as processCover: own shape, WebP, thumbnail from the finished cover, colours. */
async function processPlaceholder(png) {
  const meta = await sharp(png).metadata();
  const size = coverDimensions(meta.width, meta.height, COVER_LONG_SIDE.cover);
  const cover = await sharp(png)
    .resize(size.width, size.height, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();
  const thumbSize = coverDimensions(
    size.width,
    size.height,
    COVER_LONG_SIDE.thumb,
  );
  const thumb = await sharp(cover)
    .resize(thumbSize.width, thumbSize.height, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();
  const { dominant } = await sharp(thumb).stats();
  return {
    cover,
    thumb,
    width: size.width,
    height: size.height,
    colours: deriveCoverColours(dominant),
  };
}

// The person's own manual games that have no cover yet.
const { data: games, error: gamesError } = await db
  .from("games")
  .select("id, name")
  .eq("created_by", userId)
  .eq("source", "manual");
if (gamesError) fail("Reading games", gamesError);

const { data: covered, error: coveredError } = await db
  .from("game_images")
  .select("game_id")
  .eq("kind", "cover");
if (coveredError) fail("Reading covers", coveredError);
const hasCover = new Set((covered ?? []).map((c) => c.game_id));

let added = 0;
let skipped = 0;
for (const game of games ?? []) {
  if (hasCover.has(game.id)) {
    skipped += 1;
    continue;
  }

  const png = await sharp(Buffer.from(placeholderSvg(game.name)))
    .png()
    .toBuffer();
  const processed = await processPlaceholder(png);

  const paths = coverPaths(userId, game.id, randomUUID());
  const storage = db.storage.from("covers");
  const [up1, up2] = await Promise.all([
    storage.upload(paths.cover, processed.cover, { contentType: "image/webp" }),
    storage.upload(paths.thumb, processed.thumb, { contentType: "image/webp" }),
  ]);
  if (up1.error || up2.error) {
    fail(`Uploading the cover for ${game.name}`, up1.error ?? up2.error);
  }

  const { error: rowError } = await db.from("game_images").insert({
    game_id: game.id,
    kind: "cover",
    storage_path: paths.cover,
    width: processed.width,
    height: processed.height,
    licence: "test-placeholder",
    attribution: "Generated placeholder, not real cover art",
    dominant_color: processed.colours.tint,
    accent_color: processed.colours.glow,
  });
  if (rowError) {
    await storage.remove([paths.cover, paths.thumb]);
    fail(`Saving the cover row for ${game.name}`, rowError);
  }
  added += 1;
}

console.log(
  `Done for ${email}: ${added} placeholder covers added, ${skipped} games already had one.`,
);
