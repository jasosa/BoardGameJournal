// Fills the game-page colours for covers uploaded before the cover_colours migration.
//
// Usage:  npm run covers:colours
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the process environment (the
// npm script loads a local env file if one exists). Server-side only: it uses the service role,
// so run it only against a project you own. It reads each cover's thumbnail from storage, takes
// its dominant colour and writes the two colour columns. Rows that already have colours are left
// alone, so it is safe to run again.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
// Plain TypeScript with no imports, so Node can load it directly.
import { deriveCoverColours } from "../src/features/catalogue/cover-colours.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: rows, error } = await supabase
  .from("game_images")
  .select("id, storage_path")
  .eq("kind", "cover")
  .not("storage_path", "is", null)
  .is("dominant_color", null);
if (error) {
  console.error(`Could not read covers: ${error.message}`);
  process.exit(1);
}

let done = 0;
let failed = 0;
for (const row of rows) {
  const thumbPath = row.storage_path.replace(/cover\.webp$/, "thumb.webp");
  const file = await supabase.storage.from("covers").download(thumbPath);
  if (file.error || !file.data) {
    failed += 1;
    console.error(`Skipped ${row.id}: no thumbnail`);
    continue;
  }
  try {
    const { dominant } = await sharp(
      Buffer.from(await file.data.arrayBuffer()),
    ).stats();
    const colours = deriveCoverColours(dominant);
    const { error: updateError } = await supabase
      .from("game_images")
      .update({ dominant_color: colours.tint, accent_color: colours.glow })
      .eq("id", row.id);
    if (updateError) throw updateError;
    done += 1;
  } catch (cause) {
    failed += 1;
    console.error(`Skipped ${row.id}: ${cause?.message ?? "unknown error"}`);
  }
}
console.log(`Updated ${done} cover(s); skipped ${failed}.`);
