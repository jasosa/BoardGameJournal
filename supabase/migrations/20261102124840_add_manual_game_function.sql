-- F0.10: add a manual game and put it in the caller's collection in one transaction.
--
-- Rollback (local, no data depends on it yet): drop function public.add_manual_game(text, text);
-- and drop constraint games_name_length. Then delete this file and run `npx supabase db reset`.

alter table public.games
  add constraint games_name_length check (length(name) <= 200);

-- security invoker: runs as the caller, so RLS on games and collection_entries applies.
-- user_id and created_by come from auth.uid() column defaults.
create function public.add_manual_game(p_title text, p_status text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_game_id uuid;
  v_entry_id uuid;
begin
  insert into public.games (name, source)
  values (btrim(p_title), 'manual')
  returning id into v_game_id;

  insert into public.collection_entries (game_id, status)
  values (v_game_id, p_status)
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke execute on function public.add_manual_game(text, text) from public, anon;
grant execute on function public.add_manual_game(text, text) to authenticated;
