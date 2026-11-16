// Accepting gifts: an item is added once, only after its claim succeeds.
module.exports = ({ test, assert, openSheet, fakeSupabase, ROW_ID }) => {
  const gift = (id, name) => ({ id, to_row_id: ROW_ID, from_name: 'Rivet', claimed_at: null, item: { name, type: 'misc', quantity: 1 } });
  const gearNamed = (page, name) => page.evaluate(n => state.gear.filter(g => g.name === n).length, name);

  test('accepting a gift adds it once and claims it', async (b) => {
    const supa = fakeSupabase({ transfers: [gift('t1', 'Gift Lantern')] });
    const s = await openSheet(b, { supa });
    await s.page.click('#confirm-ok');
    await s.page.waitForTimeout(500);
    assert(await gearNamed(s.page, 'Gift Lantern') === 1, 'gift should be in gear exactly once');
    assert(supa.db.transfers[0].claimed_at, 'transfer should be marked claimed');
    return s;
  });

  test('a gift already claimed on another device is not added again', async (b) => {
    const supa = fakeSupabase({ transfers: [gift('t1', 'Gift Lantern')] });
    const s = await openSheet(b, { supa });
    supa.db.transfers[0].claimed_at = new Date().toISOString(); // other device won the race
    await s.page.click('#confirm-ok');
    await s.page.waitForTimeout(500);
    assert(await gearNamed(s.page, 'Gift Lantern') === 0, 'already-claimed gift must not be added');
    return s;
  });
};
