// Smoke tests for the character sheet.
//
// Loads the real page in headless Chromium against an in-memory fake of the
// Supabase REST API, under several start-up conditions (no saved data, saved
// data older/newer than the cloud, DM view, phone width). Fails on any
// uncaught page error or if the Field Log doesn't render its entries.
//
// The "saved data" cases matter most: the page renders once from
// localStorage before the cloud loads, and that first render is where two
// separate TDZ crashes hid (they never showed in a fresh/incognito window).
//
// Run:  node tests/smoke.js        (from the repo root)
const path = require('path');
const fs = require('fs');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'http://sheet.test';
const STORAGE_KEY = 'caelen-sheet-v1';
const ROW_ID = 'c9dbc72f-beed-4c2b-8d67-03dce25b0f7a';
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-sheet.json'), 'utf8'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

// ---- Fake Supabase -------------------------------------------------------
// Just enough PostgREST for the page: GET/POST/PATCH on character_sheets and
// item_transfers with `col=eq.value` / `col=is.null` filters, plus the
// set_sheet_key RPC. Write access to a sheet with a key requires a matching
// x-sheet-key header, mirroring the real RLS policy.
function fakeSupabase(opts = {}) {
  const db = {
    sheets: new Map(),
    transfers: opts.transfers ? opts.transfers.map(t => ({ ...t })) : [],
    keys: new Map(),     // sheet id -> passcode (plaintext is fine in a fake)
    history: [],
    writes: 0,
    offline: !!opts.offline,
    nextHistoryId: 1
  };
  if (opts.sheet !== null) {
    db.sheets.set(ROW_ID, { id: ROW_ID, data: opts.sheet || FIXTURE, schema_version: 1, updated_at: opts.updatedAt || '2026-11-16T05:07:00.000Z' });
  }
  if (opts.key) db.keys.set(ROW_ID, opts.key);
  let clock = Date.parse(opts.updatedAt || '2026-11-16T05:07:00.000Z');
  const now = () => new Date(clock += 1000).toISOString();

  const parseFilters = (url) => {
    const f = [];
    for (const [k, v] of url.searchParams) {
      if (['select', 'order', 'limit'].includes(k)) continue;
      const m = /^(eq|is)\.(.*)$/.exec(v);
      if (m) f.push([k, m[1], decodeURIComponent(m[2])]);
    }
    return f;
  };
  const matches = (row, filters) => filters.every(([k, op, v]) =>
    op === 'is' ? (v === 'null' ? row[k] == null : false)
      : k === 'updated_at' ? Date.parse(row[k]) === Date.parse(v) : String(row[k]) === v);
  const canWrite = (id, headers) => !db.keys.has(id) || headers['x-sheet-key'] === db.keys.get(id);
  // Mirrors the database's sheet_guard trigger (supabase/migrations).
  const guard = (prev, next, headers) => {
    if (!next || typeof next !== 'object' || Array.isArray(next) || !Object.keys(next).length) return 'sheet_guard: refusing to blank sheet';
    if (headers['x-allow-shrink'] === 'yes' || !prev) return null;
    const ol = JSON.stringify(prev).length, nl = JSON.stringify(next).length;
    if (ol > 1024 && nl < ol * 0.4) return 'sheet_guard: refusing to shrink sheet';
    for (const [k, v] of Object.entries(prev)) {
      if (Array.isArray(v) && v.length >= 3 && (!Array.isArray(next[k]) || next[k].length === 0)) return `sheet_guard: refusing to empty "${k}"`;
    }
    return null;
  };
  const archive = (r) => db.history.push({ id: db.nextHistoryId++, sheet_id: r.id, data: JSON.parse(JSON.stringify(r.data)), schema_version: r.schema_version, saved_at: r.updated_at, archived_at: new Date(clock).toISOString() });
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  async function handle(route) {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const headers = req.headers();
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    if (db.offline) return route.abort();

    if (url.pathname.endsWith('/rpc/set_sheet_key')) {
      const { sheet_id, old_key, new_key } = body;
      if (!db.keys.has(sheet_id)) return json(route, 400, { message: 'this sheet has no passcode; the first one is set in the Supabase SQL editor' });
      if (db.keys.get(sheet_id) !== old_key) return json(route, 400, { message: 'wrong current passcode' });
      if (new_key) db.keys.set(sheet_id, new_key); else db.keys.delete(sheet_id);
      return json(route, 200, true);
    }
    if (url.pathname.endsWith('/rpc/sheet_has_key')) {
      return json(route, 200, db.keys.has(body.sheet_id));
    }

    if (url.pathname.endsWith('/character_sheets')) {
      const filters = parseFilters(url);
      if (method === 'GET') {
        return json(route, 200, [...db.sheets.values()].filter(r => matches(r, filters)));
      }
      if (method === 'POST') {
        if (!canWrite(body.id, headers)) return json(route, 401, { message: 'new row violates row-level security policy' });
        const prev = db.sheets.get(body.id);
        const upsert = /merge-duplicates/.test(headers['prefer'] || '');
        if (prev && !upsert) return json(route, 409, { message: 'duplicate key value violates unique constraint' });
        if (prev) {
          const bad = guard(prev.data, body.data, headers);
          if (bad) return json(route, 400, { message: bad });
          archive(prev);
        }
        const row = { ...(prev || {}), ...body, updated_at: now() };
        db.sheets.set(body.id, row); db.writes++;
        return json(route, 201, [row]);
      }
      if (method === 'PATCH') {
        const out = [];
        for (const r of db.sheets.values()) {
          if (!matches(r, filters) || !canWrite(r.id, headers)) continue;
          const bad = body.data !== undefined ? guard(r.data, body.data, headers) : null;
          if (bad) return json(route, 400, { message: bad });
          archive(r);
          Object.assign(r, body, { updated_at: now() });
          out.push(r); db.writes++;
        }
        return json(route, 200, out);
      }
    }

    if (url.pathname.endsWith('/character_sheet_history')) {
      const filters = parseFilters(url);
      const rows = db.history.filter(r => matches(r, filters)).sort((a, b) => b.id - a.id);
      const limit = +url.searchParams.get('limit') || rows.length;
      return json(route, 200, rows.slice(0, limit));
    }
    if (url.pathname.endsWith('/item_transfers')) {
      const filters = parseFilters(url);
      if (method === 'GET') return json(route, 200, db.transfers.filter(r => matches(r, filters)));
      if (method === 'POST') { const r = { id: 'tr-' + db.transfers.length, created_at: now(), claimed_at: null, ...body }; db.transfers.push(r); return json(route, 201, [r]); }
      if (method === 'PATCH') {
        const out = db.transfers.filter(r => matches(r, filters));
        out.forEach(r => Object.assign(r, body));
        return json(route, 200, out);
      }
    }
    return json(route, 404, { message: 'not faked: ' + method + ' ' + url.pathname });
  }

  // Simulate "another device" editing the cloud copy directly.
  db.remoteEdit = (fn) => {
    const r = db.sheets.get(ROW_ID);
    archive(r);
    r.data = JSON.parse(JSON.stringify(r.data));
    fn(r.data);
    r.updated_at = now();
  };
  return { db, handle };
}

// ---- Harness -------------------------------------------------------------
async function openSheet(browser, opts = {}) {
  const ctx = await browser.newContext(opts.mobile ? devices['iPhone 13'] : {});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(1, 4).join('\n')));
  page.on('dialog', d => d.dismiss());
  const supa = opts.supa || fakeSupabase(opts);
  await page.route('**/*.supabase.co/**', supa.handle);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
  await page.route(ORIGIN + '/**', route => {
    let p = new URL(route.request().url()).pathname;
    if (p === '/') p = '/index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ status: 200, contentType: MIME[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
  if (opts.local) {
    await page.addInitScript(([key, val, extra]) => {
      if (sessionStorage.getItem('__seeded')) return;
      localStorage.setItem(key, val);
      for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(k, v);
      sessionStorage.setItem('__seeded', '1');
    }, [STORAGE_KEY, JSON.stringify(opts.local), opts.localExtra]);
  }
  await page.goto(ORIGIN + '/index.html' + (opts.query || ''));
  await page.waitForFunction(() => {
    const el = document.getElementById('save-cloud');
    return el && /synced|offline|live|locked/i.test(el.textContent);
  }, null, { timeout: 10000 }).catch(() => errors.push('cloud status never settled'));
  await page.waitForTimeout(300);
  // Section renderers catch their own errors (safeRender) so the sheet keeps
  // working, which also hides them from 'pageerror'. Collect them on demand.
  const origPush = errors.push.bind(errors);
  page.collectRenderErrors = async () => {
    const r = await page.evaluate(() => window.__renderErrors || []).catch(() => []);
    r.forEach(x => origPush('render error: ' + x));
  };
  return { ctx, page, errors, supa };
}

const logCount = (page) => page.evaluate(() => document.querySelectorAll('#log-list .log-entry').length);
const withTime = (data, iso) => ({ ...JSON.parse(JSON.stringify(data)), updatedAt: iso });

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function assert(cond, msg) { if (!cond) throw new Error(msg); }

test('fresh browser loads the cloud copy', async (b) => {
  const s = await openSheet(b, {});
  assert(await logCount(s.page) === FIXTURE.logEntries.length, 'expected cloud log entries to render');
  return s;
});

test('saved copy older than cloud (includes an empty-body entry)', async (b) => {
  const s = await openSheet(b, { local: withTime(FIXTURE, '2026-11-01T00:00:00.000Z') });
  assert(await logCount(s.page) === FIXTURE.logEntries.length, 'expected log entries to render');
  return s;
});

test('saved copy newer than cloud', async (b) => {
  const s = await openSheet(b, { local: withTime(FIXTURE, '2026-11-17T00:00:00.000Z') });
  assert(await logCount(s.page) === FIXTURE.logEntries.length, 'expected log entries to render');
  return s;
});

test('cloud offline, saved copy only', async (b) => {
  const s = await openSheet(b, { offline: true, local: withTime(FIXTURE, '2026-11-01T00:00:00.000Z') });
  assert(await logCount(s.page) === FIXTURE.logEntries.length, 'expected log entries to render offline');
  return s;
});

test('DM view', async (b) => {
  const s = await openSheet(b, { query: '?view=dm' });
  assert(await logCount(s.page) === FIXTURE.logEntries.length, 'expected log entries in DM view');
  return s;
});

test('phone width with saved copy', async (b) => {
  const s = await openSheet(b, { mobile: true, local: withTime(FIXTURE, '2026-11-01T00:00:00.000Z') });
  assert(await logCount(s.page) === FIXTURE.logEntries.length, 'expected log entries on mobile');
  // Compare against the phone's real width: if anything is too wide, mobile
  // browsers widen the whole layout (innerWidth grows too), so comparing to
  // innerWidth would never catch it.
  const device = s.page.viewportSize().width;
  const r = await s.page.evaluate((W) => {
    const wide = [];
    document.querySelectorAll('body *').forEach(el => {
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.right > W + 1 && getComputedStyle(el).position !== 'fixed' && ![...el.children].some(c => c.getBoundingClientRect().right > W + 1)) wide.push((el.id ? '#' + el.id : el.tagName.toLowerCase()) + '.' + String(el.className).split(' ')[0]);
    });
    return { layout: document.documentElement.scrollWidth, wide: [...new Set(wide)].slice(0, 6) };
  }, device);
  assert(r.layout <= device + 1, `page is ${r.layout}px wide on a ${device}px phone; too wide: ${r.wide.join(', ')}`);
  return s;
});

test('add a Field Log entry and it saves to the cloud', async (b) => {
  const s = await openSheet(b, {});
  await s.page.click('#log-add-btn');
  await s.page.fill('.log-entry.editing .log-title-input', 'Smoke entry');
  await s.page.fill('.log-entry.editing .log-body-input', 'body text');
  await s.page.waitForTimeout(2000);
  const row = s.supa.db.sheets.get(ROW_ID);
  assert(row.data.logEntries.some(e => e.title === 'Smoke entry' && e.body === 'body text'), 'new entry did not reach the cloud');
  return s;
});

test('a failing section shows a banner instead of breaking the page', async (b) => {
  const s = await openSheet(b, {});
  const r = await s.page.evaluate(() => {
    let after = false;
    safeRender('fakeSection', () => { throw new Error('boom'); });
    after = true;
    const bar = document.getElementById('render-error-banner');
    const out = { after, text: bar && bar.textContent };
    window.__renderErrors = []; bar && bar.remove();
    return out;
  });
  assert(r.after && /fakeSection/.test(r.text || ''), 'expected banner naming the failed section');
  return s;
});

// Extra test modules (one per feature) register themselves here.
for (const f of fs.readdirSync(__dirname).filter(f => /^smoke\..+\.js$/.test(f)).sort()) {
  require(path.join(__dirname, f))({ test, assert, openSheet, fakeSupabase, logCount, withTime, FIXTURE, ROW_ID, STORAGE_KEY, ORIGIN });
}

(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch();
  let failed = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    let s;
    try {
      s = await t.fn(browser);
      if (s && s.page && s.page.collectRenderErrors) await s.page.collectRenderErrors();
      if (s && s.errors.length) throw new Error(s.errors.join('\n'));
      console.log('  ok   ' + t.name);
    } catch (e) {
      failed++;
      console.log('  FAIL ' + t.name + '\n       ' + String(e.message).split('\n').join('\n       '));
    } finally {
      if (s && s.ctx) await s.ctx.close();
    }
  }
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
