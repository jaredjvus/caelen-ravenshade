// Unit tests for merge.js (run: node tests/merge.test.js).
const assert = require('assert');
const { mergeSheets, sameSheet } = require('../merge.js');

const e = (id, title, extra = {}) => ({ id, title, body: '', tags: [], ...extra });
const base = {
  level: 4, hpCurrent: 30, coins: { gp: 10, sp: 2 },
  logEntries: [e('a', 'A'), e('b', 'B'), e('c', 'C')],
  gear: [{ id: 'g1', name: 'Sickle', equipped: true }, { id: 'g2', name: 'Lute', equipped: true }],
  sectionOpen: { log: true }, updatedAt: 'x'
};
const copy = (o) => JSON.parse(JSON.stringify(o));
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };

t('one side changed: take it', () => {
  const local = copy(base); local.hpCurrent = 12;
  const m = mergeSheets(base, local, copy(base));
  assert.strictEqual(m.hpCurrent, 12);
  const remote = copy(base); remote.level = 5;
  assert.strictEqual(mergeSheets(base, copy(base), remote).level, 5);
});

t('different fields changed on each side: keep both', () => {
  const local = copy(base); local.hpCurrent = 12;
  const remote = copy(base); remote.level = 5;
  const m = mergeSheets(base, local, remote);
  assert.strictEqual(m.hpCurrent, 12); assert.strictEqual(m.level, 5);
});

t('both added log entries: both kept', () => {
  const local = copy(base); local.logEntries.unshift(e('L', 'phone'));
  const remote = copy(base); remote.logEntries.unshift(e('R', 'laptop'));
  const ids = mergeSheets(base, local, remote).logEntries.map(x => x.id).sort();
  assert.deepStrictEqual(ids, ['L', 'R', 'a', 'b', 'c']);
});

t('deleted on one side, untouched on the other: stays deleted', () => {
  const local = copy(base); local.hpCurrent = 1;
  const remote = copy(base); remote.logEntries = remote.logEntries.filter(x => x.id !== 'b');
  const m = mergeSheets(base, local, remote);
  assert.deepStrictEqual(m.logEntries.map(x => x.id), ['a', 'c']);
  assert.strictEqual(m.hpCurrent, 1);
});

t('deleted on one side, edited on the other: edit survives', () => {
  const local = copy(base); local.logEntries[1].body = 'important';
  const remote = copy(base); remote.logEntries = remote.logEntries.filter(x => x.id !== 'b');
  const m = mergeSheets(base, local, remote);
  assert.strictEqual(m.logEntries.find(x => x.id === 'b').body, 'important');
});

t('same entry edited on both sides, different fields: both edits kept', () => {
  const local = copy(base); local.logEntries[0].body = 'new body';
  const remote = copy(base); remote.logEntries[0].tags = ['npc'];
  const a = mergeSheets(base, local, remote).logEntries.find(x => x.id === 'a');
  assert.strictEqual(a.body, 'new body'); assert.deepStrictEqual(a.tags, ['npc']);
});

t('same field changed on both sides: this device wins', () => {
  const local = copy(base); local.hpCurrent = 5;
  const remote = copy(base); remote.hpCurrent = 25;
  assert.strictEqual(mergeSheets(base, local, remote).hpCurrent, 5);
});

t('nested objects merge per key', () => {
  const local = copy(base); local.coins.gp = 20;
  const remote = copy(base); remote.coins.sp = 9;
  assert.deepStrictEqual(mergeSheets(base, local, remote).coins, { gp: 20, sp: 9 });
});

t('no base: lists unioned, preferLocal decides plain values', () => {
  const local = copy(base); local.logEntries = [e('a', 'A'), e('L', 'phone')]; local.level = 5;
  const remote = copy(base);
  const m1 = mergeSheets(null, local, remote, { preferLocal: true });
  assert.deepStrictEqual(m1.logEntries.map(x => x.id).sort(), ['L', 'a', 'b', 'c']);
  assert.strictEqual(m1.level, 5);
  assert.strictEqual(mergeSheets(null, local, remote, { preferLocal: false }).level, 4);
});

t('fresh device that edited defaults offline keeps the cloud sheet', () => {
  const defaults = { level: 1, hpCurrent: null, logEntries: [], gear: [{ id: 'g1', name: 'Sickle', equipped: true }], coins: { gp: 0, sp: 0 } };
  const local = copy(defaults); local.hpCurrent = 3; // tapped damage before the cloud loaded
  const m = mergeSheets(defaults, local, copy(base));
  assert.strictEqual(m.level, 4);
  assert.strictEqual(m.logEntries.length, 3);
  assert.strictEqual(m.gear.length, 2);
  assert.strictEqual(m.hpCurrent, 3);
});

t('updatedAt is ignored by sameSheet and dropped from merges', () => {
  assert.ok(sameSheet({ ...base, updatedAt: 'a' }, { ...base, updatedAt: 'b' }));
  assert.ok(!('updatedAt' in mergeSheets(base, copy(base), copy(base))));
});

t('inputs are not modified', () => {
  const local = copy(base); local.logEntries.push(e('z', 'Z'));
  const snap = JSON.stringify(local);
  mergeSheets(base, local, copy(base));
  assert.strictEqual(JSON.stringify(local), snap);
});

console.log(`\n${n} merge tests passed`);
