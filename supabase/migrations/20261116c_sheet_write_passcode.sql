-- APPLIED 2026-11-16 (after 20261116b). Verified with a rolled-back test: no
-- passcode = unchanged; protected sheet refuses no/wrong passcode, accepts the
-- right one; passcode never stored; other sheets unaffected; the API cannot
-- set a first passcode.
--
-- Until a sheet has a passcode, nothing changes: anyone with the page can
-- save it, exactly as before (so the other party members' sheets are
-- unaffected unless they opt in). Once a passcode is set, saves to that
-- sheet are refused unless they carry the passcode, which the page sends
-- (as a "__sheet_key" marker inside the saved data, stripped before
-- storing) after you enter it once on each device. Reading is unchanged
-- (the DM view and party features keep working).
--
-- A marker in the body rather than a custom HTTP header: browsers only
-- send custom headers cross-origin if the API's CORS rules allow them.
--
-- The passcode is stored only as a SHA-256 hash, in a table the API can't
-- read. Pick a long passphrase: the endpoint is public, so a short PIN
-- could be guessed.
--
-- TURNING IT ON for a sheet (SQL editor only, on purpose: if the page could
-- set a first passcode, anyone could lock any party member's sheet):
--
--   insert into public.sheet_write_keys (sheet_id, key_hash)
--   values ('c9dbc72f-beed-4c2b-8d67-03dce25b0f7a', public.sheet_key_hash('your long passphrase'));
--
-- Then open the sheet on each device; the first save asks for it once.
-- The page's Options menu can change or remove it (needs the current one).
-- Lost it? Run in the SQL editor:
--   delete from public.sheet_write_keys where sheet_id = '<sheet id>';

create table if not exists public.sheet_write_keys (
  sheet_id   uuid primary key,
  key_hash   text not null,
  updated_at timestamptz not null default now()
);
alter table public.sheet_write_keys enable row level security;
-- No policies: invisible to the API. Only the functions below touch it.

create or replace function public.sheet_key_hash(k text)
returns text
language sql
immutable
set search_path = public, extensions
as $$ select encode(extensions.digest(coalesce(k, ''), 'sha256'), 'hex') $$;

-- Runs before the guard/history trigger (trigger names fire alphabetically).
create or replace function public.character_sheets_key_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  stored text;
begin
  select key_hash into stored from sheet_write_keys where sheet_id = new.id;
  if stored is not null then
    if new.data is null or jsonb_typeof(new.data) <> 'object'
       or sheet_key_hash(new.data ->> '__sheet_key') <> stored then
      raise exception 'sheet_locked: this sheet needs its passcode to save' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger character_sheets_0_key_guard
  before insert or update on public.character_sheets
  for each row execute function public.character_sheets_key_guard();

create or replace function public.sheet_has_key(sheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from sheet_write_keys k where k.sheet_id = sheet_has_key.sheet_id) $$;

-- Change or remove (new_key null/empty) a sheet's passcode; requires the
-- current one. Can't set a first passcode (see above).
create or replace function public.set_sheet_key(sheet_id uuid, old_key text, new_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_hash text;
begin
  select key_hash into current_hash from sheet_write_keys k where k.sheet_id = set_sheet_key.sheet_id;
  if current_hash is null then
    raise exception 'this sheet has no passcode; the first one is set in the Supabase SQL editor' using errcode = 'P0001';
  end if;
  if current_hash <> sheet_key_hash(old_key) then
    raise exception 'wrong current passcode' using errcode = 'P0001';
  end if;
  if new_key is null or new_key = '' then
    delete from sheet_write_keys k where k.sheet_id = set_sheet_key.sheet_id;
    return true;
  end if;
  if length(new_key) < 8 then
    raise exception 'passcode must be at least 8 characters' using errcode = 'P0001';
  end if;
  update sheet_write_keys k set key_hash = sheet_key_hash(new_key), updated_at = now()
  where k.sheet_id = set_sheet_key.sheet_id;
  return true;
end;
$$;

grant execute on function public.sheet_has_key(uuid) to anon, authenticated;
grant execute on function public.set_sheet_key(uuid, text, text) to anon, authenticated;
