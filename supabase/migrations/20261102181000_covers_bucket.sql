-- L5b: private storage for cover images, and one cover per game.
--
-- Files live at {user_id}/{game_id}/{image_id}/cover.webp and thumb.webp. The app resizes
-- every upload and stores only the processed WebP files, so the bucket accepts only WebP up
-- to 2 MB. Only the owner folder is readable or writable. Images are served to the browser
-- through an authenticated app route, never through public or signed links.
--
-- Rollback (local, no data depends on it): drop the four policies below and the index,
-- delete objects from the bucket, then `delete from storage.buckets where id = 'covers'`.
-- Or delete this file and run `npx supabase db reset`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', false, 2097152, array['image/webp'])
on conflict (id) do nothing;

-- Owner folder only: the first path segment must be the caller's user id.
create policy "covers: owner can read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "covers: owner can upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "covers: owner can replace" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "covers: owner can delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- A game has at most one cover.
create unique index game_images_one_cover_per_game
  on public.game_images (game_id)
  where kind = 'cover';
