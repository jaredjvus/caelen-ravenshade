// Sync safety: the cloud copy is never overwritten with older or blank data.
module.exports = ({ test, assert, openSheet, fakeSupabase, logCount, withTime, FIXTURE, ROW_ID, STORAGE_KEY }) => {
  const cloudRow = (supa) => supa.db.sheets.get(ROW_ID);
  const cloudLogIds = (supa) => cloudRow(supa).data.logEntries.map(e => e.id).sort();
  const wait = (page, ms) => page.waitForTimeout(ms);
  const addEntry = async (page, title) => {
    await page.click('#log-add-btn');
    await page.fill('.log-entry.editing .log-title-input', title);
  };
  // Waits for the debounced save + upload to finish.
  const settle = (page) => page.waitForFunction(() => {
    const el = document.getElementById('save-cloud');
    return el && /synced|offline|refused/i.test(el.textContent) && !cloud.pushing;
  }, null, { timeout: 8000 }).then(() => wait(page, 1500));

  test('a device that opens offline never uploads, then merges once online', async (b) => {
    const supa = fakeSupabase({ offline: true });
    const s = await openSheet(b, { supa });            // fresh device, no saved copy, cloud unreachable
    await s.page.click('#hp-damage-btn').catch(() => {});
    await s.page.keyboard.press('Escape').catch(() => {});
    await s.page.evaluate(() => { state.tempHp = 7; saveState(); });
    await wait(s.page, 2000);
    assert(supa.db.writes === 0, 'offline device must not upload anything (wrote ' + supa.db.writes + ')');
    supa.db.offline = false;
    await s.page.evaluate(() => window.dispatchEvent(new Event('online')));
    await settle(s.page);
    const row = cloudRow(supa);
    assert(row.data.logEntries.length === FIXTURE.logEntries.length, 'cloud log entries must survive');
    assert(row.data.level === FIXTURE.level, 'cloud level must survive (got ' + row.data.level + ')');
    assert(await logCount(s.page) === FIXTURE.logEntries.length, 'page should now show the cloud entries');
    assert(await s.page.evaluate(() => state.tempHp) === 7, 'the offline edit should be kept');
    return s;
  });

  test('two devices adding log entries: both entries survive', async (b) => {
    const supa = fakeSupabase({});
    const s = await openSheet(b, { supa });
    supa.db.remoteEdit(d => d.logEntries.unshift({ id: 'log-from-laptop', title: 'From laptop', body: '', tags: [], createdAt: 5, updatedAt: 5 }));
    await addEntry(s.page, 'From phone');
    await settle(s.page);
    const ids = cloudLogIds(supa);
    assert(ids.includes('log-from-laptop'), 'the other device\'s entry was lost: ' + ids.join(','));
    assert(cloudRow(supa).data.logEntries.some(e => e.title === 'From phone'), 'this device\'s entry was lost');
    assert(await logCount(s.page) === FIXTURE.logEntries.length + 2, 'page should show both new entries');
    return s;
  });

  test('another device deleting an entry is respected', async (b) => {
    const supa = fakeSupabase({});
    const s = await openSheet(b, { supa });
    supa.db.remoteEdit(d => { d.logEntries = d.logEntries.filter(e => e.id !== 'log-session-4'); });
    await s.page.evaluate(() => { state.tempHp = 4; saveState(); });
    await settle(s.page);
    assert(!cloudLogIds(supa).includes('log-session-4'), 'deleted entry came back');
    assert(cloudRow(supa).data.tempHp === 4, 'local edit lost');
    return s;
  });

  test('stale saved copy from an earlier visit is merged, not pushed over the cloud', async (b) => {
    // This device last synced at T0 and then made an offline edit; the cloud
    // has since moved on (another device added an entry).
    const supa = fakeSupabase({ updatedAt: '2026-11-16T05:07:00.000Z' });
    const base = { updated_at: '2026-11-16T05:07:00.000Z', data: FIXTURE };
    const local = withTime(FIXTURE, '2026-11-16T06:00:00.000Z');
    local.logEntries = [{ id: 'log-offline', title: 'Written offline', body: '', tags: [], createdAt: 9, updatedAt: 9 }, ...local.logEntries];
    supa.db.remoteEdit(d => d.logEntries.unshift({ id: 'log-other', title: 'Other device', body: '', tags: [], createdAt: 8, updatedAt: 8 }));
    const s = await openSheet(b, { supa, local, localExtra: { [STORAGE_KEY + '-base']: JSON.stringify(base) } });
    await settle(s.page);
    const ids = cloudLogIds(supa);
    assert(ids.includes('log-offline') && ids.includes('log-other'), 'expected both entries in the cloud, got ' + ids.join(','));
    return s;
  });

  test('a tab coming back into view picks up other devices\' changes', async (b) => {
    const supa = fakeSupabase({});
    const s = await openSheet(b, { supa });
    supa.db.remoteEdit(d => d.logEntries.unshift({ id: 'log-new', title: 'Added elsewhere', body: '', tags: [], createdAt: 9, updatedAt: 9 }));
    await s.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await wait(s.page, 800);
    assert(await logCount(s.page) === FIXTURE.logEntries.length + 1, 'tab should show the new entry after refocus');
    return s;
  });

  test('the cloud refusing a wipe leaves the cloud unchanged and tells the player', async (b) => {
    const supa = fakeSupabase({});
    const s = await openSheet(b, { supa });
    await s.page.evaluate(() => { state.logEntries = []; saveState(); }); // simulates a bug wiping the log
    await settle(s.page);
    assert(cloudRow(supa).data.logEntries.length === FIXTURE.logEntries.length, 'cloud log must be untouched');
    const title = await s.page.textContent('#confirm-title');
    assert(/refused/i.test(title), 'expected the "Cloud save refused" dialog, got: ' + title);
    return s;
  });

  test('reset is deliberate: allowed, and the old version is kept in history', async (b) => {
    const supa = fakeSupabase({});
    const s = await openSheet(b, { supa });
    await s.page.evaluate(() => { document.getElementById('options-toggle').click(); });
    await s.page.click('#reset-btn');
    await s.page.click('#confirm-ok');
    await settle(s.page);
    assert(cloudRow(supa).data.logEntries.length === 0, 'reset should go through');
    const last = supa.db.history[supa.db.history.length - 1];
    assert(last && last.data.logEntries.length === FIXTURE.logEntries.length, 'previous version should be in history');
    return s;
  });
};
