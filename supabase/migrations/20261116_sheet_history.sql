-- Version history for character sheets.
--
-- Every update that changes a sheet's `data` first copies the previous
-- version into character_sheet_history, so a bad save or a stale tab
-- overwriting newer edits can always be undone. The newest 2000 versions
-- per sheet are kept (sheets are a few KB each).
--
-- Also stamps updated_at = now() on every update, so the server clock is
-- the single source of truth the pages use to detect concurrent edits.
--
-- Applies to every sheet in the table and needs no client changes, so the
-- other party members' sheets get history too.

create table if not exists public.character_sheet_history (
  id             bigint generated always as identity primary key,
  sheet_id       uuid        not null,
  data           jsonb       not null,
  schema_version integer,
  saved_at       timestamptz not null,           -- when this version was saved (its updated_at)
  archived_at    timestamptz not null default now()  -- when it was replaced
);
create index if not exists character_sheet_history_sheet_idx
  on public.character_sheet_history (sheet_id, id desc);

alter table public.character_sheet_history enable row level security;
-- Read-only for the page (the restore UI lists versions). No insert/update/
-- delete policies: only the trigger below (security definer) writes here.
drop policy if exists "anon read" on public.character_sheet_history;
create policy "anon read" on public.character_sheet_history
  for select to anon, authenticated using (true);

create or replace function public.character_sheets_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hid bigint;
begin
  if new.data is distinct from old.data then
    insert into character_sheet_history (sheet_id, data, schema_version, saved_at)
    values (old.id, old.data, old.schema_version, old.updated_at)
    returning id into hid;
    -- Prune occasionally rather than on every save.
    if hid % 50 = 0 then
      delete from character_sheet_history
      where sheet_id = old.id
        and id < (select id from character_sheet_history
                  where sheet_id = old.id
                  order by id desc offset 2000 limit 1);
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.character_sheets_before_update() from public, anon, authenticated;

drop trigger if exists character_sheets_history on public.character_sheets;
create trigger character_sheets_history
  before update on public.character_sheets
  for each row execute function public.character_sheets_before_update();
