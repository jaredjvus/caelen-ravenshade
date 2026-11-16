-- APPLIED 2026-11-16 (after 20261116a).
--
-- The deliberate-shrink flag and the save passcode travel as marker fields
-- inside the saved data ("__allow_shrink", "__sheet_key") instead of custom
-- HTTP headers, which browsers only send cross-origin if the API's CORS
-- rules allow them. Both markers are stripped before anything is stored.
-- The x-allow-shrink header is still honoured for SQL/API callers.
--
-- Verified with a rolled-back test on the live database: wipes still
-- refused, a marked reset allowed, markers never stored, a blank sheet
-- refused even when marked.

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
  -- A deliberate reset/restore/import marks itself with "__allow_shrink": true
  -- inside the data (or the x-allow-shrink header). Markers are never stored.
  allow := coalesce(current_setting('request.headers', true)::json ->> 'x-allow-shrink', '') = 'yes';
  if new.data is not null and jsonb_typeof(new.data) = 'object' then
    if new.data ? '__allow_shrink' then
      allow := allow or coalesce(new.data ->> '__allow_shrink', '') = 'true';
    end if;
    new.data := new.data - '__allow_shrink' - '__sheet_key';
  end if;

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
          using errcode = 'P0001', hint = 'Mark a deliberate reset/restore with __allow_shrink.';
      end if;
      for k, v in select key, value from jsonb_each(old.data) loop
        if jsonb_typeof(v) = 'array' then
          if jsonb_array_length(v) >= 3 then
            nv := new.data -> k;
            if nv is null or jsonb_typeof(nv) <> 'array' then
              raise exception 'sheet_guard: refusing to remove list "%" on sheet %', k, old.id
                using errcode = 'P0001', hint = 'Mark a deliberate reset/restore with __allow_shrink.';
            elsif jsonb_array_length(nv) = 0 then
              raise exception 'sheet_guard: refusing to empty "%" on sheet %', k, old.id
                using errcode = 'P0001', hint = 'Mark a deliberate reset/restore with __allow_shrink.';
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

create or replace function public.character_sheets_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.data is not null and jsonb_typeof(new.data) = 'object' then
    new.data := new.data - '__allow_shrink' - '__sheet_key';
  end if;
  if new.data is null or jsonb_typeof(new.data) <> 'object' then
    raise exception 'sheet_guard: sheet data must be an object' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
