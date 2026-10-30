---
name: db-migration
description: How to write a Supabase/Postgres migration with RLS policies and a two-user isolation test for this project. Use for any schema change.
---

# Writing a migration

1. `npx supabase migration new <short_snake_name>` and edit the new file in `supabase/migrations/`.
2. Never edit a committed migration (a hook blocks it). Write a new one.
3. Conventions:
   - `id uuid primary key default gen_random_uuid()`
   - `created_at timestamptz not null default now()`, `updated_at` with a trigger where rows are edited
   - snake_case plural table names, `text` + `check` constraints instead of Postgres enums for statuses (easier to evolve)
   - explicit `on delete` behaviour. Personal history (plays, assessments, journal) must survive a collection entry being removed.
   - JSONB only for game-specific variable state (for example campaign state), never for core fields
   - index every foreign key and `user_id`
4. Personal table template:

```sql
create table public.collection_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  edition_id uuid references public.game_editions(id) on delete set null,
  status text not null check (status in ('owned','wishlist','interested','previously_owned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id, edition_id)
);
create index on public.collection_entries (user_id);
create index on public.collection_entries (game_id);

alter table public.collection_entries enable row level security;

create policy "owner can read" on public.collection_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner can insert" on public.collection_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner can update" on public.collection_entries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owner can delete" on public.collection_entries
  for delete to authenticated using ((select auth.uid()) = user_id);
```

5. Catalogue tables (`games`, `game_editions`, `game_images`): readable by authenticated users; rows from a provider are written by the server only; manual games have `created_by` and `visibility` and are readable only by their creator while private. Keep `source`, `external_id`, `source_url`, `attribution`, `fetched_at` columns.
6. After writing: `npx supabase db reset`, regenerate types, run `npx supabase db lint`.
7. Add an isolation test (Vitest integration or pgTAP via `npx supabase test db`): create user A and B, A inserts a row, B cannot select, update or delete it, B cannot insert with `user_id` = A.
8. If the change is destructive, add a "Migration notes" line in `docs/STATUS.md`: what changes, how to roll back, data impact.
9. Run the `db-security-reviewer` agent.
