-- L5b security review follow-up: uploads and overwrites in the covers bucket must target a
-- folder of a game the person owns ({user_id}/{game_id}/...). Before this, anyone signed in could
-- store WebP files under any made-up game folder in their own space by calling the storage API
-- directly, skipping the app.
--
-- Note: inside the subquery `name` would mean games.name, so the file path is written objects.name.
--
-- Rollback (local, no data depends on it): re-create the two policies without the exists()
-- condition, as in 20261102181000_covers_bucket.sql. Or `npx supabase db reset`.

drop policy "covers: owner can upload" on storage.objects;
create policy "covers: owner can upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.games g
      where g.id::text = (storage.foldername(objects.name))[2]
        and g.created_by = (select auth.uid())
        and g.visibility = 'private'
    )
  );

drop policy "covers: owner can replace" on storage.objects;
create policy "covers: owner can replace" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.games g
      where g.id::text = (storage.foldername(objects.name))[2]
        and g.created_by = (select auth.uid())
        and g.visibility = 'private'
    )
  );
