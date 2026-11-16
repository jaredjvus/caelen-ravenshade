// Old fields from earlier versions are cleaned up without losing any text.
module.exports = ({ test, assert, openSheet, fakeSupabase, FIXTURE, ROW_ID, withTime, STORAGE_KEY }) => {
  const legacy = () => {
    const d = JSON.parse(JSON.stringify(FIXTURE));
    d.coin = '65 gp in mixed coin';
    d.notes = 'old notes';
    d.logEntries.push({ id: 'log-imported', title: 'Imported notes', body: 'old notes', tags: [], createdAt: 2, updatedAt: 2 });
    d.inventory = { person: ['The Pendant · cracked silver'], armament: ['Sickle · simple melee weapon'] };
    d.magicItems = [];
    return d;
  };
  const settle = (page) => page.waitForTimeout(1500).then(() => page.waitForFunction(() => !cloud.pushing && /synced/i.test(document.getElementById('save-cloud').textContent), null, { timeout: 8000 })).then(() => page.waitForTimeout(600));

  test('legacy fields are archived into the Field Log once, then removed', async (b) => {
    const supa = fakeSupabase({ sheet: legacy() });
    const s = await openSheet(b, { supa });
    await settle(s.page);
    const d = supa.db.sheets.get(ROW_ID).data;
    for (const k of ['coin', 'notes', 'inventory', 'magicItems']) assert(!(k in d), `${k} should be removed from the cloud copy`);
    const arch = d.logEntries.filter(e => e.id === 'log-archived-legacy');
    assert(arch.length === 1, 'expected exactly one archive entry, got ' + arch.length);
    for (const text of ['65 gp in mixed coin', 'The Pendant · cracked silver', 'Sickle · simple melee weapon']) {
      assert(arch[0].body.includes(text), 'archive entry is missing: ' + text);
    }
    assert(d.logEntries.some(e => e.body === 'old notes'), 'imported notes entry must survive');
    // A second device with the same old data doesn't archive twice.
    const s2 = await openSheet(b, { supa, local: withTime(legacy(), '2026-11-01T00:00:00.000Z') });
    await settle(s2.page);
    const n = supa.db.sheets.get(ROW_ID).data.logEntries.filter(e => e.id === 'log-archived-legacy').length;
    await s2.ctx.close();
    assert(n === 1, 'archive entry duplicated by a second device: ' + n);
    return s;
  });

  test('legacy: notes that never made it into the Field Log are archived, not lost', async (b) => {
    const d = legacy(); d.notes = 'only copy of these notes';
    const supa = fakeSupabase({ sheet: d });
    const s = await openSheet(b, { supa });
    await settle(s.page);
    const arch = supa.db.sheets.get(ROW_ID).data.logEntries.find(e => e.id === 'log-archived-legacy');
    assert(arch && arch.body.includes('only copy of these notes'), 'unique notes must end up in the archive entry');
    return s;
  });
};
