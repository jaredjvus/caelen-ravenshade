-- APPLIED 2026-11-16.
--
-- Version history + wipe guard for character sheets. Applies to every sheet
-- in the table and needs no client changes, so the other party members'
-- sheets are protected too.
--
-- 1. Version history: every update that changes a sheet's `data` first
--    copies the previous version into character_sheet_history.
-- 2. Wipe guard: an update is refused if it would
--      - blank the sheet (null, not an object, or {}), or
--      - shrink it to under 40% of its previous size, or
--      - remove or empty a list that had 3+ entries (gear, log entries, ...)
--    unless the request carries the header `x-allow-shrink: yes`, which
--    only the page's deliberate Reset / Restore actions send. History still
--    archives the old version first in that case.
-- 3. updated_at = now() on every update, so the server clock is the single
--    source of truth the pages use to detect concurrent edits.
--
-- Note: array checks use nested IFs, not `jsonb_typeof(v) = 'array' AND
-- jsonb_array_length(v) ...` — SQL doesn't guarantee AND evaluation order,
-- and that form failed on scalar values (caught by a rolled-back test).

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
create policy "anon read" on public.character_sheet_history
  for select to anon, authenticated using (true);

create or replace function public.character_sheets_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allow      boolean;
  old_len    integer;
  new_len    integer;
  k          text;
  v          jsonb;
  nv         jsonb;
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
      for k, v in select key, value from jsonb_each(old.data) loop
        if jsonb_typeof(v) = 'array' then
          if jsonb_array_length(v) >= 3 then
            nv := new.data -> k;
            if nv is null or jsonb_typeof(nv) <> 'array' then
              raise exception 'sheet_guard: refusing to remove list "%" on sheet %', k, old.id
                using errcode = 'P0001', hint = 'Send x-allow-shrink: yes for a deliberate reset/restore.';
            elsif jsonb_array_length(nv) = 0 then
              raise exception 'sheet_guard: refusing to empty "%" on sheet %', k, old.id
                using errcode = 'P0001', hint = 'Send x-allow-shrink: yes for a deliberate reset/restore.';
            end if;
          end if;
        end if;
      end loop;
    end if;

    insert into character_sheet_history (sheet_id, data, schema_version, saved_at)
    values (old.id, old.data, old.schema_version, old.updated_at);
  end if;

  new.updated_at := now();
  return new;
end;
$$;

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
create trigger character_sheets_insert_guard
  before insert on public.character_sheets
  for each row execute function public.character_sheets_before_insert();
