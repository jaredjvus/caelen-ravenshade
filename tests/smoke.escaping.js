// User-entered text (gear, log entries, gifts from other sheets) must render
// as text, never as markup. Each payload sets window.__xss if it executes.
module.exports = ({ test, assert, openSheet, FIXTURE, ROW_ID }) => {
  const payload = (tag) => `<img src=x onerror="window.__xss=(window.__xss||[]).concat('${tag}')">`;
  const evil = JSON.parse(JSON.stringify(FIXTURE));
  evil.gear.push({
    id: 'gear-evil', name: 'Bad ' + payload('gear-name'), type: 'weapon', equipped: true, quantity: 2,
    weaponCategory: 'simple-melee', damage: '1d4', damageType: 'piercing ' + payload('dmg-type'),
    properties: payload('props'), notes: payload('gear-notes'), mastery: 'Nick', ability: 'dex'
  });
  evil.gear.push({ id: 'potion-evil', name: 'Potion ' + payload('potion'), type: 'consumable', quantity: 1, healDice: '2d4+2', notes: payload('potion-notes') });
  evil.logEntries.push({ id: 'log-evil', title: payload('log-title'), body: payload('log-body'), tags: ['x' + payload('tag')], createdAt: 1, updatedAt: 1 });
  evil.coinLog.push({ id: 'c-evil', ts: 1, kind: 'add', note: payload('coin-note'), delta: { gp: 1 } });

  test('user text renders as text, not markup', async (b) => {
    const transfers = [{ id: 'tr-evil', to_row_id: ROW_ID, from_name: payload('gift-from'), claimed_at: null, item: { name: payload('gift-item'), type: 'misc' } }];
    const s = await openSheet(b, { sheet: evil, transfers });
    // Open everything that renders user text on demand.
    await s.page.evaluate(() => { document.querySelectorAll('details').forEach(d => d.open = true); });
    await s.page.click('#gear-transfer-btn').catch(() => {});
    await s.page.waitForTimeout(400);
    const hit = await s.page.evaluate(() => window.__xss || []);
    assert(hit.length === 0, 'markup executed from: ' + hit.join(', '));
    const shown = await s.page.evaluate(() => document.body.innerText.includes('Bad <img src=x'));
    assert(shown, 'expected the gear name to be shown literally');
    return s;
  });
};
