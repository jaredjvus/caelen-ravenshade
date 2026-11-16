// Optional per-sheet write passcode.
module.exports = ({ test, assert, openSheet, fakeSupabase, ROW_ID, STORAGE_KEY, FIXTURE, withTime }) => {
  const settle = (page) => page.waitForTimeout(1500).then(() => page.waitForFunction(() => {
    const el = document.getElementById('save-cloud');
    return el && /synced|offline|refused|passcode/i.test(el.textContent) && !cloud.pushing;
  }, null, { timeout: 8000 })).then(() => page.waitForTimeout(600));
  const edit = (page, v) => page.evaluate((v) => { state.tempHp = v; saveState(); }, v);

  test('no passcode set: saves work exactly as before', async (b) => {
    const supa = fakeSupabase({});
    const s = await openSheet(b, { supa });
    await edit(s.page, 3); await settle(s.page);
    assert(supa.db.sheets.get(ROW_ID).data.tempHp === 3, 'save should go through');
    return s;
  });

  test('protected sheet: a device without the passcode keeps edits locally, asks once, then saves', async (b) => {
    const supa = fakeSupabase({ key: 'correct horse battery' });
    const s = await openSheet(b, { supa });
    await edit(s.page, 5); await settle(s.page);
    assert(supa.db.sheets.get(ROW_ID).data.tempHp !== 5, 'save without passcode must not reach the cloud');
    assert(/passcode/i.test(await s.page.textContent('#confirm-title')), 'should ask for the passcode');
    assert(await s.page.evaluate(() => state.tempHp) === 5, 'edit must be kept on this device');
    await s.page.fill('#sheet-key-input', 'correct horse battery');
    await s.page.click('#confirm-ok');
    await settle(s.page);
    assert(supa.db.sheets.get(ROW_ID).data.tempHp === 5, 'save should go through once the passcode is entered');
    // Remembered: later saves just work.
    await edit(s.page, 6); await settle(s.page);
    assert(supa.db.sheets.get(ROW_ID).data.tempHp === 6, 'remembered passcode should be used');
    assert(!('__sheet_key' in supa.db.sheets.get(ROW_ID).data), 'the passcode must never be stored with the sheet');
    assert(supa.db.customHeaders.length === 0, 'page sent custom headers (CORS risk): ' + supa.db.customHeaders.join(', '));
    return s;
  });

  test('protected sheet: a wrong passcode is not accepted', async (b) => {
    const supa = fakeSupabase({ key: 'correct horse battery' });
    const s = await openSheet(b, { supa, local: withTime(FIXTURE, '2026-11-01T00:00:00.000Z'), localExtra: { [STORAGE_KEY + '-write-key']: 'wrong guess' } });
    await edit(s.page, 9); await settle(s.page);
    assert(supa.db.sheets.get(ROW_ID).data.tempHp !== 9, 'wrong passcode must not save');
    assert(/passcode/i.test(await s.page.textContent('#confirm-title')), 'should ask again');
    return s;
  });

  test('passcode can be changed from the Options menu', async (b) => {
    const supa = fakeSupabase({ key: 'correct horse battery' });
    const s = await openSheet(b, { supa, local: withTime(FIXTURE, '2026-11-01T00:00:00.000Z'), localExtra: { [STORAGE_KEY + '-write-key']: 'correct horse battery' } });
    await s.page.evaluate(() => document.getElementById('options-toggle').click());
    await s.page.click('#passcode-btn');
    await s.page.waitForSelector('#pc-current');
    await s.page.fill('#pc-current', 'correct horse battery');
    await s.page.fill('#pc-new', 'a brand new passphrase');
    await s.page.click('#confirm-ok');
    await s.page.waitForTimeout(600);
    assert(supa.db.keys.get(ROW_ID) === 'a brand new passphrase', 'passcode should be changed');
    await edit(s.page, 11); await settle(s.page);
    assert(supa.db.sheets.get(ROW_ID).data.tempHp === 11, 'this device should save with the new passcode');
    return s;
  });
};
