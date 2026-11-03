-- Concept B trial: two colours taken from a cover, for the game page.
--
-- dominant_color: a dark tint of the cover's dominant colour (backdrop of the game page).
-- accent_color: a light colour of the same hue (lines and the pressed state).
-- Both are derived when the cover is uploaded (src/features/catalogue/cover-colours.ts) and are
-- only decoration: nothing is secured by them. They are null for covers uploaded before this
-- migration (see scripts/backfill-cover-colours.mjs) and for rows with no uploaded file.
--
-- No policy or grant change: the existing game_images policies already limit writes to the
-- owner of a private manual game, and the check constraints below only accept #rrggbb.
--
-- Rollback (nothing depends on it): alter table public.game_images drop column dominant_color,
-- drop column accent_color;

alter table public.game_images
  add column dominant_color text,
  add column accent_color text;

alter table public.game_images
  add constraint game_images_dominant_color_hex
    check (dominant_color is null or dominant_color ~ '^#[0-9a-f]{6}$'),
  add constraint game_images_accent_color_hex
    check (accent_color is null or accent_color ~ '^#[0-9a-f]{6}$');
