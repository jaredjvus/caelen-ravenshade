-- NOT YET APPLIED. Paste into Supabase > SQL Editor > New query and Run.
--
-- 1. No deletes: rows in character_sheets and character_sheet_history can't
--    be deleted or truncated (through the API or by accident in SQL). A
--    deliberate delete from the SQL editor must first run
--      select set_config('app.allow_sheet_delete', 'on', true);
--    in the same transaction.
-- 2. History rows are read-only.
-- 3. Pruning: keep the newest 2000 versions per sheet (checked every 50th
--    archived save).

create or replace function public.block_sheet_deletes()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'character_sheet_history'
     and coalesce(current_setting('app.history_prune', true), '') = 'on' then
    return old;
  end if;
  if coalesce(current_setting('app.allow_sheet_delete', true), '') = 'on' then
    if tg_level = 'ROW' then return old; end if;
    return null;
  end if;
  raise exception 'sheet_guard: deleting from % is disabled', tg_table_name
    using errcode = 'P0001',
          hint = 'Run select set_config(''app.allow_sheet_delete'', ''on'', true); first, in the same transaction, if you really mean it.';
end;
$$;

create trigger character_sheets_no_delete
  before delete on public.character_sheets
  for each row execute function public.block_sheet_deletes();
create trigger character_sheets_no_truncate
  before truncate on public.character_sheets
  for each statement execute function public.block_sheet_deletes();
create trigger character_sheet_history_no_delete
  before delete on public.character_sheet_history
  for each row execute function public.block_sheet_deletes();
create trigger character_sheet_history_no_truncate
  before truncate on public.character_sheet_history
  for each statement execute function public.block_sheet_deletes();

create or replace function public.block_history_updates()
returns trigger
language plpgsql
as $$
begin
  raise exception 'sheet_guard: history rows are read-only' using errcode = 'P0001';
end;
$$;
create trigger character_sheet_history_no_update
  before update on public.character_sheet_history
  for each row execute function public.block_history_updates();

create or replace function public.prune_sheet_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id % 50 = 0 then
    perform set_config('app.history_prune', 'on', true);
    delete from character_sheet_history
    where sheet_id = new.sheet_id
      and id < (select id from character_sheet_history
                where sheet_id = new.sheet_id
                order by id desc offset 2000 limit 1);
    perform set_config('app.history_prune', 'off', true);
  end if;
  return null;
end;
$$;
create trigger character_sheet_history_prune
  after insert on public.character_sheet_history
  for each row execute function public.prune_sheet_history();
