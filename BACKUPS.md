# Backups and recovery

The sheets are protected in three layers. If something goes wrong, start at
the top.

## 1. Version history (in the database)

Every save keeps the previous version in the `character_sheet_history`
table (the newest 2000 versions per sheet). Saves that would blank a sheet,
shrink it drastically or empty a list of 3+ entries are refused by the
database, and sheets can't be deleted through the website.

Saves are also conditional: a device only overwrites the cloud copy it
last saw. If another device saved in between, the two are merged (log
entries, gear and the coin log entry by entry) instead of one replacing the
other, and a device that opened offline never uploads until it has loaded
the cloud copy.

**To restore:** open the sheet, then **Options → Restore earlier
version**, pick a time and confirm. The version you replace is kept in the
history too, so a restore can itself be undone.

To look at the raw history in Supabase (SQL editor):

```sql
select id, saved_at, archived_at,
       jsonb_array_length(data->'logEntries') as log_entries,
       jsonb_array_length(data->'gear')       as gear
from character_sheet_history
where sheet_id = 'c9dbc72f-beed-4c2b-8d67-03dce25b0f7a'
order by id desc
limit 50;
```

## 2. Daily encrypted off-site backup (GitHub)

The **Encrypted sheet backup** workflow downloads every sheet once a day,
encrypts it with the `BACKUP_PASSPHRASE` repository secret and commits it to
the `backups` branch under `snapshots/`. This survives the Supabase project
being paused, deleted or corrupted.

**One-time setup:** in GitHub, go to *Settings → Secrets and variables →
Actions → New repository secret*, name it `BACKUP_PASSPHRASE`, and use a
long passphrase. **Also save the passphrase in your password manager**:
GitHub won't show it again, and without it the backups can't be opened.
Then run the workflow once from the *Actions* tab ("Run workflow") to check
it works.

**To decrypt a snapshot** (macOS / Linux, needs `openssl`):

```sh
git fetch origin backups
git show origin/backups:snapshots/2026-11-17T0917Z.json.gz.enc > snap.enc
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in snap.enc -pass pass:'YOUR PASSPHRASE' \
  | gunzip > snapshot.json
```

`snapshot.json` contains `character_sheets` (every sheet's full data) and
`item_transfers`. To put one sheet back, open it in the page, use
**Options → Import** with that sheet's `data` object saved as a `.json` file.

## Optional: save passcode

Anyone with the page can save a sheet unless it has a passcode. To require
one, run this in the Supabase SQL editor (use a long passphrase):

```sql
insert into public.sheet_write_keys (sheet_id, key_hash)
values ('c9dbc72f-beed-4c2b-8d67-03dce25b0f7a', public.sheet_key_hash('your long passphrase'));
```

Each device then asks for it once, on its first save. **Options → Save
passcode** changes or removes it. Lost it: `delete from
public.sheet_write_keys where sheet_id = '<sheet id>';` in the SQL editor.

## 3. This device

The page also keeps the last saved copy in the browser (`localStorage`,
plus a backup key), and **Options → Export** downloads it as a file at any
time.
