-- Initial schema: profiles, games, game_editions, game_images, collection_entries.
-- Catalogue identity (games, editions, images) is separate from personal records
-- (profiles, collection_entries). Every personal table has user_id and owner-only RLS.
--
-- Rollback (local only, no data yet): `npx supabase db reset` after deleting this file,
-- or drop the five tables, the two functions and the auth.users trigger below.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (personal)
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (length(display_name) <= 80),
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "owner can read" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner can insert" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner can update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- No delete policy: a profile is removed only when the auth user is deleted (cascade).

-- Create the profile row when an auth user is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- games (catalogue)
-- ---------------------------------------------------------------------------

create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  sort_name text,
  year smallint,
  description text,
  min_players smallint check (min_players > 0),
  max_players smallint check (max_players >= min_players),
  play_time_min smallint check (play_time_min > 0),
  weight numeric(3, 2) check (weight between 1 and 5),
  kind text not null default 'base'
    check (kind in ('base', 'expansion', 'standalone_expansion')),
  -- Provenance. Manual games use source = 'manual'.
  source text not null,
  external_id text,
  source_url text,
  attribution text,
  fetched_at timestamptz,
  -- Ownership of manual records. Null for provider rows.
  -- Cascade: account deletion removes the user's private manual games.
  created_by uuid default auth.uid() references auth.users(id) on delete cascade,
  visibility text not null default 'private'
    check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (visibility = 'public' or created_by is not null)
);

create unique index games_source_external_id_key
  on public.games (source, external_id) where external_id is not null;
create index games_created_by_idx on public.games (created_by);
create index games_name_idx on public.games (name);

create trigger games_set_updated_at
  before update on public.games
  for each row execute function public.set_updated_at();

alter table public.games enable row level security;

-- Read: public catalogue rows plus the user's own private manual rows.
create policy "read public or own" on public.games
  for select to authenticated
  using (visibility = 'public' or created_by = (select auth.uid()));

-- Users can only create private manual games. Provider rows use the service role.
create policy "create own manual" on public.games
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and visibility = 'private'
    and source = 'manual'
  );

create policy "update own manual" on public.games
  for update to authenticated
  using (
    created_by = (select auth.uid()) and visibility = 'private' and source = 'manual'
  )
  with check (
    created_by = (select auth.uid()) and visibility = 'private' and source = 'manual'
  );

create policy "delete own manual" on public.games
  for delete to authenticated
  using (
    created_by = (select auth.uid()) and visibility = 'private' and source = 'manual'
  );

-- ---------------------------------------------------------------------------
-- game_editions (catalogue)
-- ---------------------------------------------------------------------------

create table public.game_editions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  publisher text,
  year smallint,
  language text,
  source text not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Lets other tables reference (edition, game) together, so an edition cannot be
  -- attached to a different game (foreign keys ignore RLS).
  unique (id, game_id)
);

create index game_editions_game_id_idx on public.game_editions (game_id);
-- Only provider rows take part in the unique id check, so a user's manual rows can never
-- block or collide with a later provider import.
create unique index game_editions_source_external_id_key
  on public.game_editions (source, external_id)
  where external_id is not null and source <> 'manual';

create trigger game_editions_set_updated_at
  before update on public.game_editions
  for each row execute function public.set_updated_at();

alter table public.game_editions enable row level security;

-- The subqueries on games run under the caller's RLS, so visibility follows the parent.
create policy "read if game visible" on public.game_editions
  for select to authenticated
  using (exists (select 1 from public.games g where g.id = game_editions.game_id));

create policy "write if own manual game" on public.game_editions
  for insert to authenticated
  with check (
    source = 'manual'
    and external_id is null
    and exists (
      select 1 from public.games g
      where g.id = game_editions.game_id
        and g.created_by = (select auth.uid())
        and g.visibility = 'private'
    )
  );

create policy "update if own manual game" on public.game_editions
  for update to authenticated
  using (
    exists (
      select 1 from public.games g
      where g.id = game_editions.game_id
        and g.created_by = (select auth.uid())
        and g.visibility = 'private'
    )
  )
  with check (
    source = 'manual'
    and external_id is null
    and exists (
      select 1 from public.games g
      where g.id = game_editions.game_id
        and g.created_by = (select auth.uid())
        and g.visibility = 'private'
    )
  );

create policy "delete if own manual game" on public.game_editions
  for delete to authenticated
  using (
    exists (
      select 1 from public.games g
      where g.id = game_editions.game_id
        and g.created_by = (select auth.uid())
        and g.visibility = 'private'
    )
  );

-- ---------------------------------------------------------------------------
-- game_images (catalogue)
-- ---------------------------------------------------------------------------

create table public.game_images (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  edition_id uuid,
  storage_path text,
  url text check (url ~ '^https://'),
  width integer check (width > 0),
  height integer check (height > 0),
  kind text not null default 'cover' check (kind in ('cover', 'box', 'other')),
  -- Provenance and rights.
  attribution text,
  licence text,
  created_at timestamptz not null default now(),
  check (storage_path is not null or url is not null),
  -- The edition must belong to the same game. Deleting the edition clears edition_id only.
  foreign key (edition_id, game_id)
    references public.game_editions (id, game_id) on delete set null (edition_id)
);

create index game_images_game_id_idx on public.game_images (game_id);
create index game_images_edition_id_idx on public.game_images (edition_id);

alter table public.game_images enable row level security;

create policy "read if game visible" on public.game_images
  for select to authenticated
  using (exists (select 1 from public.games g where g.id = game_images.game_id));

create policy "write if own manual game" on public.game_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.games g
      where g.id = game_images.game_id
        and g.created_by = (select auth.uid())
        and g.visibility = 'private'
    )
  );

create policy "update if own manual game" on public.game_images
  for update to authenticated
  using (
    exists (
      select 1 from public.games g
      where g.id = game_images.game_id
        and g.created_by = (select auth.uid())
        and g.visibility = 'private'
    )
  )
  with check (
    exists (
      select 1 from public.games g
      where g.id = game_images.game_id
        and g.created_by = (select auth.uid())
        and g.visibility = 'private'
    )
  );

create policy "delete if own manual game" on public.game_images
  for delete to authenticated
  using (
    exists (
      select 1 from public.games g
      where g.id = game_images.game_id
        and g.created_by = (select auth.uid())
        and g.visibility = 'private'
    )
  );

-- ---------------------------------------------------------------------------
-- collection_entries (personal)
-- ---------------------------------------------------------------------------

create table public.collection_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- NO ACTION (checked at end of statement): blocks deleting a game that is still in
  -- someone's collection, but lets account deletion cascade through both tables.
  game_id uuid not null references public.games(id) on delete no action,
  edition_id uuid,
  status text not null
    check (status in ('owned', 'wishlist', 'interested', 'previously_owned')),
  acquired_on date,
  sold_on date,
  price numeric(10, 2) check (price >= 0),
  currency text check (currency ~ '^[A-Z]{3}$'),
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The edition, if given, must belong to the same game.
  foreign key (edition_id, game_id)
    references public.game_editions (id, game_id) on delete set null (edition_id)
  -- No unique (user_id, game_id, edition_id): a user can own several copies of a game.
);

create index collection_entries_user_id_idx on public.collection_entries (user_id);
create index collection_entries_game_id_idx on public.collection_entries (game_id);
create index collection_entries_edition_id_idx on public.collection_entries (edition_id);
create index collection_entries_user_status_idx on public.collection_entries (user_id, status);

create trigger collection_entries_set_updated_at
  before update on public.collection_entries
  for each row execute function public.set_updated_at();

alter table public.collection_entries enable row level security;

create policy "owner can read" on public.collection_entries
  for select to authenticated using ((select auth.uid()) = user_id);

-- The game must be visible to the user (games RLS applies inside the subquery).
create policy "owner can insert" on public.collection_entries
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.games g where g.id = collection_entries.game_id)
  );

create policy "owner can update" on public.collection_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.games g where g.id = collection_entries.game_id)
  );

create policy "owner can delete" on public.collection_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Privileges: nothing for anonymous visitors. RLS still limits authenticated users.
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.games, public.game_editions,
  public.game_images, public.collection_entries from anon;

-- TRUNCATE ignores RLS; TRIGGER and REFERENCES are not needed by the app.
revoke truncate, trigger, references on public.profiles, public.games,
  public.game_editions, public.game_images, public.collection_entries from authenticated;

-- Future tables and functions in public start with no access for anon.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
