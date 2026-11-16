-- Data-loss guardrails for character sheets.
--
-- Applies to every sheet in the table and needs no client changes, so the
-- other party members' sheets are protected too.
--
-- 1. Version history: every update that changes a sheet's `data` first
--    copies the previous version into character_sheet_history. The newest
--    2000 versions per sheet are kept (sheets are a few KB each).
-- 2. Wipe guard: an update is refused if it would
--      - blank the sheet (null, not an object, or {}), or
--      - shrink it to under 40% of its previous size, or
--      - empty a list that had 3+ entries (gear, log entries, ...)
--    unless the request carries the header `x-allow-shrink: yes`, which
--    only the page's deliberate Reset / Restore actions send. History still
--    archives the old version first in that case.
-- 3. No deletes: rows in character_sheets and character_sheet_history can't
--    be deleted or truncated through the API or by accident in SQL. A
--    deliberate delete from the SQL editor must first run
--      select set_config('app.allow_sheet_delete', 'on', true);
--    in the same transaction.
-- 4. updated_at = now() on every update, so the server clock is the single
--    source of truth the pages use to detect concurrent edits.

-- ---------------------------------------------------------------- history
create table if not exists public.character_sheet_history (
  id             bigint generated always as identity primary key,
  sheet_id       uuid        not null,
  data           jsonb       not null,
  schema_version integer,
  saved_at       timestamptz not null,               -- when this version was saved (its updated_at)
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
revoke insert, update, delete, truncate on public.character_sheet_history from anon, authenticated;

-- ------------------------------------------------------- update guard + archive
create or replace function public.character_sheets_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hid        bigint;
  allow      boolean;
  old_len    integer;
  new_len    integer;
  k          text;
begin
  allow := coalesce(current_setting('request.headers', true)::json ->> 'x-allow-shrink', '') = 'yes';

  if new.data is null or jsonb_typeof(new.data) <> 'object' or new.data = '{}'::jsonb then
    raise exception 'sheet_guard: refusing to blank sheet %', old.id
      using errcode = 'P0001', hint = 'The previous version is unchanged.';
  end if;

  if new.data is distinct from old.data then
    if not allow then
      old_len := length(old.data::text);
      new_len := length(new.data::text);
      if old_len > 1024 and new_len < old_len * 0.4 then
        raise exception 'sheet_guard: refusing to shrink sheet % from % to % bytes', old.id, old_len, new_len
          using errcode = 'P0001', hint = 'Send x-allow-shrink: yes for a deliberate reset/restore.';
      end if;
      for k in select key from jsonb_each(old.data)
               where jsonb_typeof(value) = 'array' and jsonb_array_length(value) >= 3 loop
        if jsonb_typeof(new.data -> k) is distinct from 'array'
           or jsonb_array_length(new.data -> k) = 0 then
          raise exception 'sheet_guard: refusing to empty "%" on sheet %', k, old.id
            using errcode = 'P0001', hint = 'Send x-allow-shrink: yes for a deliberate reset/restore.';
        end if;
      end loop;
    end if;

    insert into character_sheet_history (sheet_id, data, schema_version, saved_at)
    values (old.id, old.data, old.schema_version, old.updated_at)
    returning id into hid;

    -- Prune occasionally rather than on every save.
    if hid % 50 = 0 then
      perform set_config('app.history_prune', 'on', true);
      delete from character_sheet_history
      where sheet_id = old.id
        and id < (select id from character_sheet_history
                  where sheet_id = old.id
                  order by id desc offset 2000 limit 1);
      perform set_config('app.history_prune', 'off', true);
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists character_sheets_history on public.character_sheets;
create trigger character_sheets_history
  before update on public.character_sheets
  for each row execute function public.character_sheets_before_update();

-- Blank inserts too (a new row must carry real data).
create or replace function public.character_sheets_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.data is null or jsonb_typeof(new.data) <> 'object' then
    raise exception 'sheet_guard: sheet data must be an object' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists character_sheets_insert_guard on public.character_sheets;
create trigger character_sheets_insert_guard
  before insert on public.character_sheets
  for each row execute function public.character_sheets_before_insert();

-- --------------------------------------------------------------- no deletes
create or replace function public.block_sheet_deletes()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'character_sheet_history'
     and coalesce(current_setting('app.history_prune', true), '') = 'on' then
    return old;  -- the update trigger's own pruning
  end if;
  if coalesce(current_setting('app.allow_sheet_delete', true), '') = 'on' then
    return case when tg_level = 'ROW' then old else null end;
  end if;
  raise exception 'sheet_guard: deleting from % is disabled', tg_table_name
    using errcode = 'P0001',
          hint = 'Run select set_config(''app.allow_sheet_delete'', ''on'', true); first, in the same transaction, if you really mean it.';
end;
$$;

drop trigger if exists character_sheets_no_delete on public.character_sheets;
create trigger character_sheets_no_delete
  before delete on public.character_sheets
  for each row execute function public.block_sheet_deletes();
drop trigger if exists character_sheets_no_truncate on public.character_sheets;
create trigger character_sheets_no_truncate
  before truncate on public.character_sheets
  for each statement execute function public.block_sheet_deletes();

drop trigger if exists character_sheet_history_no_delete on public.character_sheet_history;
create trigger character_sheet_history_no_delete
  before delete on public.character_sheet_history
  for each row execute function public.block_sheet_deletes();
drop trigger if exists character_sheet_history_no_truncate on public.character_sheet_history;
create trigger character_sheet_history_no_truncate
  before truncate on public.character_sheet_history
  for each statement execute function public.block_sheet_deletes();

-- History rows are immutable.
create or replace function public.block_history_updates()
returns trigger
language plpgsql
as $$
begin
  raise exception 'sheet_guard: history rows are read-only' using errcode = 'P0001';
end;
$$;
drop trigger if exists character_sheet_history_no_update on public.character_sheet_history;
create trigger character_sheet_history_no_update
  before update on public.character_sheet_history
  for each row execute function public.block_history_updates();

-- Belt and braces: the API roles never get DELETE on sheets.
revoke delete, truncate on public.character_sheets from anon, authenticated;

revoke all on function public.character_sheets_before_update() from public, anon, authenticated;
revoke all on function public.character_sheets_before_insert() from public, anon, authenticated;
revoke all on function public.block_sheet_deletes()           from public, anon, authenticated;
revoke all on function public.block_history_updates()         from public, anon, authenticated;
