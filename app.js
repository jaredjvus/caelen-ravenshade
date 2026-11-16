// ============================================================
// STATE MANAGEMENT
// ============================================================

const STORAGE_KEY = 'caelen-sheet-v1';
const STORAGE_KEY_BAK = STORAGE_KEY + '-bak';
// HTML-escape any user-entered text before it goes into innerHTML. Gear,
// notes and log entries can arrive from other sheets (item transfers) or
// an imported file, so none of it can be trusted as markup.
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Shallow copy of an object with every string field escaped (numbers and
// booleans pass through), for templates that interpolate many fields.
function escFields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) out[k] = typeof v === 'string' ? esc(v) : v;
  return out;
}

// Field Log placeholder for entries with no body.
const LOG_EMPTY_BODY = 'No details yet — click Edit to add some.';

const DEFAULT_STATE = {
  schemaVersion: 1,
  updatedAt: null, // ISO string, set on every local save; used to compare with cloud
  level: 1,
  hpCurrent: null, // null = match max
  tempHp: 0,       // temporary HP, doesn't stack with itself (Inspiring Leader, etc.)
  coin: '65 gp in mixed coin, including 50 gp from his last booking',
  notes: '',
  inventory: JSON.parse(JSON.stringify(DEFAULT_INVENTORY)),
  alternates: {}, // featId -> optionId
  usedSlots: { warlock: 0, sorc1: 0, sorc2: 0, sorc3: 0, sorc4: 0, sorc5: 0, sorc6: 0, sorc7: 0, sorc8: 0 },
  sorceryPoints: 0,           // current; max = Sorcerer level (sorc 2+)
  innateSorceryUsed: 0,       // 0 / 1 / 2 (max uses = 2 / long rest)
  magicalCunningUsed: false,  // 1 / long rest
  heavenlyWingsUsed: false,   // 1 / long rest (the transformation itself)
  healingHandsUsed: false,    // 1 / long rest (Aasimar species trait)
  hexbladesCurseUsed: false,  // 1 / short or long rest
  luckPointsUsed: 0,          // 0-3 (Lucky feat, if chosen at L16); resets on long rest
  concentratingOn: null,      // spell name string, or null
  deathSavesSuccess: 0,       // 0-3
  deathSavesFail: 0,          // 0-3
  conditions: {},             // { blinded: true, frightened: true, ... }
  exhaustion: 0,              // 0-6 (2024 exhaustion levels)
  heroicInspiration: false,   // 2024 PHB universal mechanic; advantage on one d20 roll
  tidesOfChaosUsed: false,    // Wild Magic sorc 3 feature; resets on long rest OR DM-triggered surge
  lastSurgeRoll: null,        // 1-100 of the last Wild Magic Surge roll, persists for DM visibility
  sectionOpen: {},            // sectionId -> bool; remembers collapsed/expanded top-level sections
  // Found magic items (loot/awards). Each: { id, name, type, rarity,
  // attunement (bool), attuned (bool), chargesMax, chargesUsed, notes }
  magicItems: [],
  // Hit Dice tracking (Warlock d8 + Sorcerer d6, spent independently)
  hitDiceWarlockUsed: 0,
  hitDiceSorcererUsed: 0,
  // GEAR — structured inventory (drives AC, attacks, saves, etc.)
  gear: [
      {
          "id": "caelen-sickle",
          "name": "Sickle (Pact Bonded — Hex Warrior)",
          "type": "weapon",
          "equipped": true,
          "quantity": 1,
          "weight": 2,
          "damage": "1d4",
          "damageType": "slashing",
          "weaponCategory": "simple-melee",
          "properties": "Light",
          "mastery": "Sap",
          "ability": "cha",
          "rarity": "Mundane",
          "notes": "His mother's, for cutting herbs. Hex Warrior + Pact of the Blade: attacks use CHA."
      },
      {
          "id": "caelen-daggers",
          "name": "Daggers",
          "type": "weapon",
          "equipped": true,
          "quantity": 2,
          "weight": 1,
          "damage": "1d4",
          "damageType": "piercing",
          "weaponCategory": "simple-melee",
          "properties": "Finesse, Light, Thrown 20/60",
          "mastery": "Nick",
          "ability": "finesse",
          "rarity": "Mundane",
          "notes": "Sheathed at the small of the back. Last resort."
      },
      {
          "id": "caelen-crossbow",
          "name": "Light Crossbow",
          "type": "weapon",
          "equipped": true,
          "quantity": 1,
          "weight": 5,
          "damage": "1d8",
          "damageType": "piercing",
          "weaponCategory": "simple-ranged",
          "properties": "Ammunition (80/320), Loading, Two-Handed",
          "mastery": "Slow",
          "ability": "dex",
          "rarity": "Mundane",
          "notes": "Carried but rarely fired."
      },
      {
          "id": "caelen-bolts",
          "name": "Crossbow Bolts",
          "type": "misc",
          "quantity": 20,
          "weight": 0.075,
          "notes": "For the Light Crossbow."
      },
      {
          "id": "caelen-leather",
          "name": "Leather Armor",
          "type": "armor",
          "equipped": true,
          "weight": 10,
          "armorBase": 11,
          "armorType": "light",
          "rarity": "Mundane",
          "notes": "Soft, oiled, dark."
      },
      {
          "id": "caelen-pendant",
          "name": "Cracked Silver Pendant (Arcane Focus)",
          "type": "misc",
          "equipped": true,
          "weight": 0,
          "notes": "His mother's. Worn always. Fragment of obsidian set in cracked silver; doubles as his Arcane Focus."
      },
      {
          "id": "caelen-lute",
          "name": "Lute",
          "type": "misc",
          "weight": 2,
          "notes": "Second-hand, three pegs replaced. The one true joy he allows himself."
      },
      {
          "id": "caelen-pack",
          "name": "Scholar's Pack",
          "type": "misc",
          "weight": 10,
          "notes": "Book of cantrips, ink, parchment, ten torches, ten days' rations, waterskin."
      },
      {
          "id": "caelen-letters",
          "name": "Letters",
          "type": "misc",
          "quantity": 7,
          "weight": 0,
          "notes": "Sealed, addressed to 'Sarielle Ravenshade, anywhere.' Never sent."
      }
  ]
};

// IS_DM must be initialized before any code path that calls saveState() (which
// reads IS_DM to decide whether to skip cloud writes). The legacy-magic-items
// migration runs saveState() and was hitting a temporal-dead-zone ReferenceError.
const IS_DM = new URLSearchParams(location.search).get('view') === 'dm';
if (document.body) document.body.classList.toggle('dm-mode', IS_DM);

let state = loadState();

// One-time migration: port any entries from the legacy state.magicItems array
// into state.gear, then empty state.magicItems so they don't double-count in
// the attunement tracker. Runs every load but is a no-op after the first time
// (since state.magicItems is left empty after migration).
function migrateLegacyMagicItemsToGear() {
  const legacy = state.magicItems || [];
  if (legacy.length === 0) return;
  state.gear = state.gear || [];
  for (const mi of legacy) {
    // Map legacy free-text 'type' to a structured gear type. Best-effort.
    const rawType = (mi.type || '').toLowerCase();
    let gearType = 'wondrous';
    if (/weapon|sword|axe|hammer|bow|crossbow|spear|polearm|glaive|halberd/.test(rawType)) gearType = 'weapon';
    else if (/armor/.test(rawType)) gearType = 'armor';
    else if (/shield/.test(rawType)) gearType = 'shield';
    else if (/cloak/.test(rawType)) gearType = 'cloak';
    else if (/ring/.test(rawType)) gearType = 'ring';
    else if (/boots/.test(rawType)) gearType = 'boots';
    else if (/wand/.test(rawType)) gearType = 'wand';
    else if (/rod/.test(rawType)) gearType = 'rod';
    else if (/amulet/.test(rawType)) gearType = 'amulet';
    state.gear.push({
      id: mi.id || ('gear-mig-' + Date.now() + '-' + Math.floor(Math.random() * 99999)),
      name: mi.name || 'Migrated Magic Item',
      type: gearType,
      quantity: 1,
      weight: 0,
      rarity: mi.rarity || 'Uncommon',
      requiresAttunement: !!mi.attunement,
      attuned: !!mi.attuned,
      equipped: false,
      chargesMax: mi.chargesMax || 0,
      chargesUsed: mi.chargesUsed || 0,
      notes: (mi.notes || '') + '\n\n[Auto-migrated from legacy Magic Items. Click Edit to add mechanical effect fields (AC, saves, attack, damage, etc.) if this item should drive sheet stats.]'
    });
  }
  state.magicItems = [];
  saveState();
}

function loadState() {
  const tryParse = (raw) => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  };
  const primary = tryParse(localStorage.getItem(STORAGE_KEY));
  if (primary) return { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...primary };
  const backup = tryParse(localStorage.getItem(STORAGE_KEY_BAK));
  if (backup) {
    console.warn('Loaded from backup localStorage key');
    return { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...backup };
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

// ============================================================
// CLOUD SYNC (Supabase REST)
// ============================================================
// Security model: writes are open via RLS; the row UUID below is the only
// thing keeping random visitors out. Don't post it publicly.

const SUPABASE_PROJECT = 'amnfbhhmwhsythzkvcra';
const SUPABASE_KEY = 'sb_publishable_f4f6TevmVgjSLw07PuJLgQ_ED8xhitb';
const ROW_ID = 'c9dbc72f-beed-4c2b-8d67-03dce25b0f7a';
const SB_REST = `https://${SUPABASE_PROJECT}.supabase.co/rest/v1/character_sheets`;
const SB_AUTH = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

// ============================================================
// CROSS-CHARACTER ITEM TRANSFERS (shared `item_transfers` table)
// ============================================================
// Same Supabase project, same auth, different table. Lets a player hand a
// gear item to another party member's sheet without a shared inventory —
// each sheet stays its own independent row in `character_sheets`.
const SB_REST_TRANSFERS = `https://${SUPABASE_PROJECT}.supabase.co/rest/v1/item_transfers`;
const FROM_NAME = 'Caelen';
const PARTY_MEMBERS = [
  { name: 'Rivet',   rowId: 'dcb7e8f3-78c1-425e-bdaa-b4f08d416053' },
  { name: 'Haldeyr', rowId: '2f4ce1a7-0be9-4830-acdb-1cfa0765cb98' },
  { name: 'Dampe',   rowId: '6976359e-5cbb-4629-b2ff-ec7bcf5a4c5d' }
];

async function postItemTransfer(toRowId, item) {
  const r = await fetch(SB_REST_TRANSFERS, {
    method: 'POST',
    headers: { ...SB_AUTH, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ from_row_id: ROW_ID, from_name: FROM_NAME, to_row_id: toRowId, item })
  });
  if (!r.ok) throw new Error(`transfer post ${r.status}: ${await r.text()}`);
  const rows = await r.json();
  return rows[0];
}

async function fetchPendingTransfers() {
  const r = await fetch(`${SB_REST_TRANSFERS}?to_row_id=eq.${ROW_ID}&claimed_at=is.null`, { headers: SB_AUTH });
  if (!r.ok) throw new Error(`transfer fetch ${r.status}`);
  return await r.json();
}

// Marks a transfer claimed, but only if nobody has claimed it yet
// (`claimed_at=is.null`), so two open tabs/devices can't both accept the same
// gift. Returns the claimed row, or undefined if it was already claimed.
async function claimTransfer(transferId) {
  const r = await fetch(`${SB_REST_TRANSFERS}?id=eq.${encodeURIComponent(transferId)}&claimed_at=is.null`, {
    method: 'PATCH',
    headers: { ...SB_AUTH, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ claimed_at: new Date().toISOString() })
  });
  if (!r.ok) throw new Error(`transfer claim ${r.status}: ${await r.text()}`);
  const rows = await r.json();
  return rows[0];
}

// DM view: read-only, polls the cloud every 5s. Activated with ?view=dm.
// IS_DM is hoisted near the top of the script (above loadState/migration).
// Re-apply dm-mode class here in case <body> wasn't ready when the early line ran.
if (IS_DM) document.body.classList.add('dm-mode');

async function fetchRemote() {
  const r = await fetch(`${SB_REST}?id=eq.${ROW_ID}&select=data,schema_version,updated_at`, { headers: SB_AUTH });
  if (!r.ok) throw new Error(`fetch ${r.status}`);
  const rows = await r.json();
  return rows[0] || null;
}

async function pushRemote(snapshot) {
  // Upsert: creates the row on first save, updates on subsequent saves. Earlier
  // PATCH version silently no-op'd when the row didn't yet exist, leading to
  // saves disappearing for sheets whose UUID was never INSERTed.
  const r = await fetch(SB_REST, {
    method: 'POST',
    headers: { ...SB_AUTH, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ id: ROW_ID, data: snapshot, schema_version: snapshot.schemaVersion || 1 })
  });
  if (!r.ok) throw new Error(`upsert ${r.status}: ${await r.text()}`);
  const rows = await r.json();
  return rows[0];
}

let cloudTimer = null;
function syncToCloud() {
  if (cloudTimer) clearTimeout(cloudTimer);
  setCloudStatus('syncing', 'Cloud: saving…');
  cloudTimer = setTimeout(async () => {
    try {
      const row = await pushRemote(state);
      if (row && row.updated_at) {
        // Adopt the server's timestamp as our local truth so next load
        // doesn't see a phantom "cloud is newer" from clock skew.
        state.updatedAt = row.updated_at;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
      }
      setCloudStatus('synced', 'Cloud: synced');
    } catch (e) {
      console.error('cloud sync failed', e);
      setCloudStatus('error', 'Cloud: offline');
    }
  }, 800);
}

function setCloudErrorBanner(visible) {
  const banner = document.getElementById('cloud-error-banner');
  if (banner) banner.classList.toggle('visible', visible);
}

function setCloudStatus(kind, text) {
  const el = document.getElementById('save-cloud');
  el.textContent = text;
  el.classList.remove('cloud-synced', 'cloud-syncing', 'cloud-error', 'cloud-loading');
  if (kind === 'synced')  el.classList.add('cloud-synced');
  if (kind === 'syncing') el.classList.add('cloud-syncing');
  if (kind === 'error')   el.classList.add('cloud-error');
  if (kind === 'loading') el.classList.add('cloud-loading');
  el.classList.add('show');
  setCloudErrorBanner(kind === 'error');
}

function setLoadedFrom(source) {
  const labels = {
    cloud:         '· loaded from cloud ·',
    'local-newer': '· loaded from device (newer than cloud) ·',
    local:         '· loaded from device (cloud unreachable) ·',
    defaults:      '· loaded from defaults ·'
  };
  document.getElementById('loaded-from').textContent = labels[source] || '';
}

// ============================================================
// LOCAL SAVE
// ============================================================

let saveTimer = null;
function saveState() {
  if (IS_DM) return; // DM view is strictly read-only; never persist or sync
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      state.updatedAt = new Date().toISOString();
      const snapshot = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, snapshot);
      localStorage.setItem(STORAGE_KEY_BAK, snapshot);
      showSaveIndicator();
      syncToCloud();
    } catch (e) { console.error('Save failed', e); }
  }, 400);
}

function showSaveIndicator() {
  const el = document.getElementById('save-local');
  el.classList.add('show');
  clearTimeout(showSaveIndicator._t);
  showSaveIndicator._t = setTimeout(() => el.classList.remove('show'), 1500);
}

// ============================================================
// COMPUTED VALUES
// ============================================================

function mod(score) { return Math.floor((score - 10) / 2); }
function fmtMod(m) { return m >= 0 ? '+' + m : '−' + Math.abs(m); }

function computeStats(level) {
  // Start with base + background
  const stats = { ...BASE_STATS };
  for (const [k, v] of Object.entries(BG_BONUS)) stats[k] += v;

  // Apply level-based ASIs cumulatively
  for (let l = 1; l <= level; l++) {
    const ld = LEVEL_DATA[l];
    if (!ld) continue;
    // Built-in ASI
    if (ld.asi) {
      for (const [k, v] of Object.entries(ld.asi)) stats[k] += v;
    }
    // Feat-based ASI (depends on alternate choice)
    if (ld.feat) {
      const chosen = state.alternates[ld.feat.id] || ld.feat.default;
      const opt = ld.feat.options.find(o => o.id === chosen);
      if (opt && opt.asi) {
        for (const [k, v] of Object.entries(opt.asi)) stats[k] += v;
      }
    }
  }
  // Cap at 20
  for (const k of Object.keys(stats)) stats[k] = Math.min(20, stats[k]);
  // Gear stat overrides (Gauntlets of Ogre Power → STR 19, Belt of Hill Giant
  // → STR 21, Headband of Intellect → INT 19, Amulet of Health → CON 19).
  // Applied AFTER the 20-cap so these magic items can exceed the cap as RAW.
  const gearMods = computeGearMods();
  for (const [k, v] of Object.entries(gearMods.statOverrides || {})) {
    if (v > (stats[k] || 0)) stats[k] = v;
  }
  return stats;
}

function profBonus(level) {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

function classBreakdown(level) {
  if (level < 1) return { w: 0, s: 0 };
  const ld = LEVEL_DATA[level];
  return { w: ld.warlock, s: ld.sorcerer };
}

function classString(level) {
  const { w, s } = classBreakdown(level);
  const parts = [];
  if (w > 0) parts.push(`Hexblade Warlock ${w}`);
  if (s > 0) parts.push(`Wild Magic Sorcerer ${s}`);
  return parts.join(' / ');
}

function ebBeams(level) {
  if (level >= 17) return 4;
  if (level >= 11) return 3;
  if (level >= 5) return 2;
  return 1;
}

function computeHP(level, stats) {
  // DM house rule: Average+1 HP per level after L1.
  // Warlock d8 average 5 → 6 + CON per level (2+).
  // Sorcerer d6 average 4 → 5 + CON per level.
  // L1 still uses the full die (8 + CON).
  const conMod = mod(stats.con);
  const { w, s } = classBreakdown(level);
  let hp = 8 + conMod; // L1 max die
  for (let i = 2; i <= w; i++) hp += 6 + conMod;
  for (let i = 1; i <= s; i++) hp += 5 + conMod;
  // Gear HP bonuses (homebrew items granting +N max HP, etc.)
  const gearMods = computeGearMods();
  hp += gearMods.hpBonus || 0;
  return Math.max(1, hp);
}

function hpFormulaText(level, stats) {
  const { w, s } = classBreakdown(level);
  const conMod = mod(stats.con);
  const parts = ['max die L1 (8)'];
  if (w >= 2) parts.push(`${w - 1}×Warlock avg+1 (6)`);
  if (s >= 1) parts.push(`${s}×Sorcerer avg+1 (5)`);
  parts.push(`${conMod * (w + s)} CON`);
  return parts.join(' + ');
}

function hasSaveProf(stat, level) {
  // Warlock saves: WIS + CHA
  if (stat === 'wis' || stat === 'cha') return true;
  // Check if Resilient(CON) was taken
  for (let l = 1; l <= level; l++) {
    const ld = LEVEL_DATA[l];
    if (ld && ld.feat) {
      const chosen = state.alternates[ld.feat.id] || ld.feat.default;
      const opt = ld.feat.options.find(o => o.id === chosen);
      if (opt && opt.saveProf === stat) return true;
    }
  }
  return false;
}

function hasFeat(featId, level) {
  for (let l = 1; l <= level; l++) {
    const ld = LEVEL_DATA[l];
    if (ld && ld.feat) {
      const chosen = state.alternates[ld.feat.id] || ld.feat.default;
      if (chosen === featId) return true;
    }
  }
  return false;
}

// ============================================================
// RENDER
// ============================================================

// Runs one section's renderer, so a bug in one card can't blank the rest of
// the sheet (or abort the script). Failures are logged, collected on
// window.__renderErrors (the smoke tests assert it stays empty) and surfaced
// in a small banner instead of failing silently.
function safeRender(name, fn) {
  try { fn(); }
  catch (e) { reportRenderError(name, e); }
}
function reportRenderError(name, e) {
  console.error(`[render] ${name} failed:`, e);
  window.__renderErrors = window.__renderErrors || [];
  window.__renderErrors.push(`${name}: ${e && e.message}`);
  let bar = document.getElementById('render-error-banner');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'render-error-banner';
    bar.className = 'render-error-banner';
    bar.setAttribute('role', 'alert');
    bar.innerHTML = '<span class="reb-text"></span><button type="button" aria-label="Dismiss">×</button>';
    bar.querySelector('button').addEventListener('click', () => bar.remove());
    document.body.appendChild(bar);
  }
  const failed = [...new Set(window.__renderErrors.map(x => x.split(':')[0]))];
  bar.querySelector('.reb-text').textContent =
    `Part of the sheet failed to display (${failed.join(', ')}). Your data is safe — try reloading.`;
}

function render() {
  const level = state.level;
  const stats = computeStats(level);
  const pb = profBonus(level);
  const { w, s } = classBreakdown(level);
  const hp = computeHP(level, stats);

  // Title bar
  document.getElementById('title-classes').textContent = classString(level);
  document.getElementById('level-display').textContent = level;
  const upBtn = document.getElementById('level-up-btn');
  if (upBtn) upBtn.disabled = level >= 20;
  const downBtn = document.getElementById('level-down-btn');
  if (downBtn) downBtn.disabled = level <= 1;

  // Stats
  for (const stat of ['str','dex','con','int','wis','cha']) {
    const v = stats[stat];
    const valEl = document.getElementById(`${stat}-val`);
    const oldVal = parseInt(valEl.textContent, 10);
    valEl.textContent = v;
    document.getElementById(`${stat}-mod`).textContent = fmtMod(mod(v));
    // Flash if changed
    if (oldVal !== v) {
      valEl.classList.add('changed');
      setTimeout(() => valEl.classList.remove('changed'), 1500);
    }
  }

  // Defense (apply exhaustion penalty to initiative — it's a d20 test)
  const exhaustPen = getExhaustionPenalty();
  // Defense — reads equipped armor + shield + magic items from state.gear.
  const gearMods = computeGearMods();
  let ac, acSubText;
  if (gearMods.equippedArmor) {
    const a = gearMods.equippedArmor;
    let dexContrib = 0;
    if (a.armorType === 'light') dexContrib = mod(stats.dex);
    else if (a.armorType === 'medium') dexContrib = Math.min(2, mod(stats.dex));
    ac = (a.armorBase || 0) + dexContrib + (gearMods.shieldEquipped ? gearMods.shieldAcBonus : 0) + gearMods.acBonus;
    acSubText = `${a.name}${gearMods.shieldEquipped ? ' + Shield' : ''}${gearMods.acBonus ? ' + magic' : ''}`;
  } else {
    ac = 10 + mod(stats.dex) + (gearMods.shieldEquipped ? gearMods.shieldAcBonus : 0) + gearMods.acBonus;
    acSubText = '10 + DEX (unarmored)' + (gearMods.shieldEquipped ? ' + Shield' : '') + (gearMods.acBonus ? ' + magic' : '');
  }
  document.getElementById('ac-val').textContent = ac;
  const acSub = document.getElementById('ac-sub');
  if (acSub) acSub.textContent = acSubText; // leather + DEX (AC isn't a d20 test)
  document.getElementById('hp-max').textContent = hp;
  document.getElementById('init-val').textContent = fmtMod(mod(stats.dex) - exhaustPen);
  safeRender('renderSensesCard', () => renderSensesCard(stats));

  // Speed (apply immobilizing conditions, plus Speedy feat if taken)
  const condEffects = getConditionEffects();
  const baseSpeed = getBaseSpeed(level);
  const speedyTaken = baseSpeed > 30;
  document.getElementById('speed-val').textContent = condEffects.speedZero ? '0 ft' : (baseSpeed + ' ft');
  let speedSub;
  if (condEffects.speedZero) {
    speedSub = 'immobilized';
  } else {
    speedSub = speedyTaken ? 'walking · +10 Speedy' : 'walking';
  }
  document.getElementById('speed-sub').textContent = speedSub;

  // HP current
  if (state.hpCurrent === null) {
    document.getElementById('hp-current').value = hp;
  } else {
    document.getElementById('hp-current').value = Math.min(state.hpCurrent, hp);
  }
  // (HP formula is now reachable via the ⓘ button on the Hit Points cell.)

  // Temp HP + Inspiring Leader button (only visible once the feat is taken)
  document.getElementById('temp-hp').value = state.tempHp || 0;
  const inspiringTaken = level >= 4 && (state.alternates['lvl4-feat'] || 'inspiring') === 'inspiring';
  document.getElementById('inspiring-btn').hidden = !inspiringTaken;

  // EB
  const beams = ebBeams(level);
  const chaMod = mod(stats.cha);
  const hasAgonizing = level >= 1;
  const ebDamage = hasAgonizing ? `1d10 + ${chaMod}` : '1d10';
  document.getElementById('eb-tohit').textContent = fmtMod(pb + chaMod - exhaustPen);
  document.getElementById('eb-damage').textContent = ebDamage;
  document.getElementById('eb-beams').textContent = beams;
  // Invocations note
  const invNote = document.getElementById('eb-invocations');
  if (level >= 2) {
    invNote.innerHTML = `<em>Agonizing Blast: +${chaMod} per beam. Repelling Blast: push 10 ft on hit.</em>`;
  } else {
    invNote.innerHTML = `<em>Agonizing Blast: +${chaMod} per beam. Repelling Blast unlocks at Warlock 2.</em>`;
  }

  // Curse
  document.getElementById('curse-bonus').textContent = pb;
  document.getElementById('curse-heal').textContent = w + chaMod;

  // Weapon Attacks (auto-built from equipped weapons in state.gear)
  safeRender('renderWeaponAttacks', () => renderWeaponAttacks(level, stats, pb));

  // Weapon Mastery Reference (static glossary, filled once — cheap to re-run)
  const masteryRefBody = document.getElementById('mastery-reference-body');
  if (masteryRefBody && !masteryRefBody.childElementCount) {
    masteryRefBody.innerHTML = weaponMasteryGlossaryHtml();
  }

  // Familiar (Pact of the Chain, Warlock 3+)
  const familiarCard = document.getElementById('familiar-card');
  if (familiarCard) familiarCard.hidden = w < 3;

  // Healing Hands (PB d4s) & Celestial Revelation damage rider (PB radiant for Heavenly Wings)
  document.getElementById('healing-hands-dice').textContent = pb;
  document.getElementById('revelation-bonus').textContent = '+' + pb;
  // Celestial Revelation locked under level 3
  const revelationBlock = document.querySelector('[data-level="3"]');
  if (revelationBlock) {
    if (level < 3) revelationBlock.classList.add('locked');
    else revelationBlock.classList.remove('locked');
  }

  // Saves
  const savesGrid = document.getElementById('saves-grid');
  savesGrid.innerHTML = '';
  const gearModsForSaves = computeGearMods();
  for (const stat of ['str','dex','con','int','wis','cha']) {
    const proficient = hasSaveProf(stat, level);
    const value = mod(stats[stat]) + (proficient ? pb : 0) - exhaustPen + (gearModsForSaves.saveBonus || 0);
    const _saveTags = [];
    if (gearModsForSaves.saveBonus) _saveTags.push(`<span class="save-tag" title="Magic item bonus from equipped/attuned gear">+${gearModsForSaves.saveBonus} · gear</span>`);
    const labels = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
    const row = document.createElement('div');
    row.className = 'skill-row' + (proficient ? ' proficient' : '');
    row.innerHTML = `<span class="skill-name">${labels[stat]}${_saveTags.length ? ' ' + _saveTags.join(' ') : ''}</span><span class="skill-value">${fmtMod(value)}</span>`;
    savesGrid.appendChild(row);
  }
  const conProf = hasSaveProf('con', level);
  document.getElementById('saves-note').textContent = conProf
    ? 'Warlock grants Wisdom and Charisma save proficiency. Resilient (CON) adds Constitution — concentration is rock solid.'
    : 'Warlock grants Wisdom and Charisma save proficiency.';

  // Skills
  const skillsGrid = document.getElementById('skills-grid');
  skillsGrid.innerHTML = '';
  for (const skill of SKILL_LIST) {
    const proficient = skill.prof;
    const value = mod(stats[skill.ability]) + (proficient ? pb : 0) - exhaustPen;
    const row = document.createElement('div');
    row.className = 'skill-row' + (proficient ? ' proficient' : '');
    row.innerHTML = `<span class="skill-name">${skill.name} (${skill.ability.toUpperCase()})</span><span class="skill-value">${fmtMod(value)}</span>`;
    skillsGrid.appendChild(row);
  }

  document.getElementById('prof-bonus').textContent = fmtMod(pb);

  // Spell DC / Attack
  document.getElementById('spell-dc').textContent = 8 + chaMod + pb;       // DC isn't a d20 test you roll
  document.getElementById('spell-atk').textContent = fmtMod(chaMod + pb - exhaustPen);

  // Musician dice = PB
  document.getElementById('musician-dice').textContent = pb;

  // Spell slots
  safeRender('renderSlots', () => renderSlots(level));

  // Sorcery points
  const sp = document.getElementById('sorcery-display');
  if (s >= 2) {
    sp.textContent = `Sorcery points: ${s} (= Sorcerer level). Convert pact slots for more.`;
  } else {
    sp.textContent = 'Sorcery points unlock at character level 6 (Sorcerer 2).';
  }

  // Spells
  safeRender('renderSpells', () => renderSpells(level));

  // Class features
  safeRender('renderClassFeatures', () => renderClassFeatures(level));

  // Alternates
  safeRender('renderAlternates', () => renderAlternates(level));

  // Combat loops
  safeRender('renderCombatLoops', () => renderCombatLoops(level));

  // Level table
  safeRender('renderLevelTable', () => renderLevelTable(level));

  // Inventory
  safeRender('renderGear', () => renderGear());
  safeRender('renderInventory', () => renderInventory());
  safeRender('renderCoins', () => renderCoins());
  safeRender('migrateLog', () => migrateLog());
  safeRender('renderLog', () => renderLog());

  // Combat resources + concentration dropdown + death saves + conditions + Wild Magic Surge
  safeRender('renderCombatResources', () => renderCombatResources(level));
  safeRender('renderConcentrationOptions', () => renderConcentrationOptions(level));
  safeRender('renderDeathSaves', () => renderDeathSaves(hp));
  safeRender('renderConditions', () => renderConditions());
  safeRender('renderSurge', () => renderSurge(level));
  // renderMagicItemsCard() call removed — the Gear card supersedes it.
  safeRender('updateVitalsBar', () => updateVitalsBar());
}

// Mirrors HP/AC/Concentration/Curse into the sticky vitals bar. Reads
// already-rendered DOM values rather than recomputing stats, so it's cheap
// to call from handlers that don't run a full render() (curse toggle,
// concentration select).
function updateVitalsBar() {
  const bar = document.getElementById('vitals-bar');
  if (!bar) return;
  const hpCurEl = document.getElementById('hp-current');
  const hpMaxEl = document.getElementById('hp-max');
  const acEl = document.getElementById('ac-val');
  const vbHpCur = document.getElementById('vb-hp-current');
  const vbHpMax = document.getElementById('vb-hp-max');
  const vbAc = document.getElementById('vb-ac-val');
  if (vbHpCur && hpCurEl) vbHpCur.textContent = hpCurEl.value;
  if (vbHpMax && hpMaxEl) vbHpMax.textContent = hpMaxEl.textContent;
  if (vbAc && acEl) vbAc.textContent = acEl.textContent;

  const concChip = document.getElementById('vb-conc-chip');
  const concName = document.getElementById('vb-conc-name');
  if (concChip) {
    concChip.hidden = !state.concentratingOn;
    if (concName) concName.textContent = state.concentratingOn || '';
  }

  const curseChip = document.getElementById('vb-curse-chip');
  const curseStatus = document.getElementById('vb-curse-status');
  if (curseChip) {
    curseChip.hidden = classBreakdown(state.level).w < 1;
    curseChip.classList.toggle('curse-used', !!state.hexbladesCurseUsed);
    if (curseStatus) curseStatus.textContent = state.hexbladesCurseUsed ? 'Used' : 'Available';
  }
}

function attunementMax(_level) { return 3; }
function totalAttunedCount() {
  return (state.magicItems || []).filter(mi => mi.attuned).length;
}
function renderMagicItemsCard() {
  const items = state.magicItems || [];
  const attuneMax = attunementMax(state.level);
  const totalAttuned = totalAttunedCount();
  document.getElementById('magic-items-summary').innerHTML =
    items.length === 0
      ? `No found items yet. Use <strong>+ Add Item</strong> for loot, awards, or curios.`
      : `${items.length} item${items.length > 1 ? 's' : ''} · <strong style="color:var(--gold);">${totalAttuned} / ${attuneMax} attuned</strong>`;

  const list = document.getElementById('magic-items-list');
  list.innerHTML = '';
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'magic-item-row';
    const attuneTag = item.attunement
      ? `<span class="attune-tag${item.attuned ? ' attune-tag-on' : ''}">${item.attuned ? 'Attuned' : 'Attune'}</span>`
      : '';
    const attuneBtn = item.attunement
      ? `<button class="mi-attune-toggle${item.attuned ? ' on' : ''}" data-toggle-attune="${item.id}" title="${item.attuned ? 'Drop attunement' : 'Attune to this item'}">${item.attuned ? 'Attuned' : 'Attune'}</button>`
      : '';
    let chargesHTML = '';
    if (item.chargesMax && item.chargesMax > 0) {
      const used = Math.min(item.chargesUsed || 0, item.chargesMax);
      let pips = '';
      for (let i = 0; i < item.chargesMax; i++) {
        pips += `<div class="pip${i >= item.chargesMax - used ? ' used' : ''}" data-charge-idx="${i}" data-item-id="${item.id}" title="Charge ${i + 1}"></div>`;
      }
      chargesHTML = `<div class="mi-charge-pips" data-item-id="${item.id}">${pips}</div>`;
    }
    row.innerHTML = `
      <div>
        <div class="mi-name">${item.name}<span class="rarity-tag">${item.rarity}</span>${attuneTag}</div>
        <div class="mi-row-meta">${item.type || ''}</div>
      </div>
      <div class="mi-row-controls">
        ${attuneBtn}
        ${chargesHTML}
        <button class="mi-edit-btn" data-edit-item="${item.id}">Edit</button>
      </div>
      ${item.notes ? `<div class="mi-row-notes">${item.notes.replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]))}</div>` : ''}
    `;
    list.appendChild(row);
  }
  list.querySelectorAll('[data-toggle-attune]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggleAttune;
      const item = (state.magicItems || []).find(x => x.id === id);
      if (!item) return;
      if (!item.attuned) {
        if (totalAttunedCount() >= attuneMax) {
          showInfo('Attunement Cap', `<p>Attunement cap reached: ${attuneMax} of ${attuneMax}. Drop one to attune to a new item.</p>`);
          return;
        }
        item.attuned = true;
      } else {
        item.attuned = false;
      }
      saveState();
      render();
    });
  });
  list.querySelectorAll('.mi-charge-pips .pip').forEach(pip => {
    pip.addEventListener('click', () => {
      const id = pip.dataset.itemId;
      const idx = parseInt(pip.dataset.chargeIdx, 10);
      const item = (state.magicItems || []).find(x => x.id === id);
      if (!item) return;
      const max = item.chargesMax;
      const used = item.chargesUsed || 0;
      const isAvailable = idx < (max - used);
      item.chargesUsed = isAvailable ? (max - idx) : (max - idx - 1);
      saveState();
      render();
    });
  });
  list.querySelectorAll('[data-edit-item]').forEach(btn => {
    btn.addEventListener('click', () => openMagicItemModal(btn.dataset.editItem));
  });
}

// Add/Edit Magic Item modal
let _editingMagicItemId = null;
function openMagicItemModal(id) {
  _editingMagicItemId = id || null;
  const existing = id ? (state.magicItems || []).find(x => x.id === id) : null;
  document.getElementById('magic-item-title').textContent = existing ? 'Edit Magic Item' : 'Add Magic Item';
  document.getElementById('mi-name').value = existing ? existing.name : '';
  document.getElementById('mi-type').value = existing ? (existing.type || '') : '';
  document.getElementById('mi-rarity').value = existing ? existing.rarity : 'Uncommon';
  document.getElementById('mi-attunement').checked = existing ? !!existing.attunement : false;
  document.getElementById('mi-charges-max').value = existing ? (existing.chargesMax || 0) : 0;
  document.getElementById('mi-notes').value = existing ? (existing.notes || '') : '';
  document.getElementById('magic-item-delete').hidden = !existing;
  document.getElementById('magic-item-overlay').hidden = false;
  setTimeout(() => document.getElementById('mi-name').focus(), 50);
}
function closeMagicItemModal() {
  document.getElementById('magic-item-overlay').hidden = true;
  _editingMagicItemId = null;
}
function saveMagicItem() {
  const name = document.getElementById('mi-name').value.trim();
  if (!name) { showInfo('Name required', '<p>Magic items must have a name.</p>'); return; }
  const item = {
    id: _editingMagicItemId || ('mi-' + Date.now() + '-' + Math.floor(Math.random() * 1e4)),
    name,
    type: document.getElementById('mi-type').value.trim(),
    rarity: document.getElementById('mi-rarity').value,
    attunement: document.getElementById('mi-attunement').checked,
    chargesMax: parseInt(document.getElementById('mi-charges-max').value, 10) || 0,
    notes: document.getElementById('mi-notes').value.trim()
  };
  if (_editingMagicItemId) {
    const list = state.magicItems || [];
    const idx = list.findIndex(x => x.id === _editingMagicItemId);
    if (idx >= 0) {
      item.attuned = list[idx].attuned && item.attunement;
      item.chargesUsed = Math.min(list[idx].chargesUsed || 0, item.chargesMax);
      list[idx] = item;
    }
  } else {
    item.attuned = false;
    item.chargesUsed = 0;
    state.magicItems = [...(state.magicItems || []), item];
  }
  saveState();
  closeMagicItemModal();
  render();
}
function deleteMagicItem() {
  if (!_editingMagicItemId) return;
  const id = _editingMagicItemId;
  showConfirm('Delete this magic item?', '<p>This removes it permanently from the sheet.</p>', () => {
    state.magicItems = (state.magicItems || []).filter(x => x.id !== id);
    saveState();
    closeMagicItemModal();
    render();
  }, { okLabel: 'Delete' });
}

// Legacy Magic Items modal listeners — null-guarded (card removed, modal removed).
{
  const _addMi = document.getElementById('add-magic-item-btn');
  if (_addMi) _addMi.addEventListener('click', (e) => { e.preventDefault(); openMagicItemModal(null); });
  const _miClose = document.getElementById('magic-item-close');
  if (_miClose) _miClose.addEventListener('click', closeMagicItemModal);
  const _miSave = document.getElementById('magic-item-save');
  if (_miSave) _miSave.addEventListener('click', saveMagicItem);
  const _miDel = document.getElementById('magic-item-delete');
  if (_miDel) _miDel.addEventListener('click', deleteMagicItem);
  const _miOverlay = document.getElementById('magic-item-overlay');
  if (_miOverlay) _miOverlay.addEventListener('click', (e) => { if (e.target.id === 'magic-item-overlay') closeMagicItemModal(); });
}

function renderSurge(level) {
  const card = document.getElementById('surge-card');
  const sorcLevel = classBreakdown(level).s;
  // Wild Magic Surge unlocks at sorc 3 (char L7) when the subclass is picked.
  if (sorcLevel < 3) { card.hidden = true; return; }
  card.hidden = false;

  const lastRoll = state.lastSurgeRoll;
  const resultEl = document.getElementById('surge-result');
  if (lastRoll) {
    const entry = WILD_MAGIC_SURGES.find(e => lastRoll >= e.min && lastRoll <= e.max);
    resultEl.innerHTML = `<strong>${lastRoll}</strong>${entry ? '— ' + entry.effect : ''}`;
  } else {
    resultEl.textContent = 'no roll yet';
  }

  const tbody = document.getElementById('surge-tbody');
  tbody.innerHTML = '';
  for (const e of WILD_MAGIC_SURGES) {
    const tr = document.createElement('tr');
    if (lastRoll && lastRoll >= e.min && lastRoll <= e.max) tr.className = 'hit';
    tr.innerHTML = `<td class="surge-range">${e.range}</td><td>${e.effect}</td>`;
    tbody.appendChild(tr);
  }
}

// Prompt-to-roll Hit Die spend on Caelen (multiclass with two different dice).
// kind = 'warlock' (d8) | 'sorcerer' (d6). Applies CON mod, caps heal at max HP.
function promptHitDieSpendCaelen(kind, index, max) {
  const die = kind === 'warlock' ? 8 : 6;
  const stateKey = kind === 'warlock' ? 'hitDiceWarlockUsed' : 'hitDiceSorcererUsed';
  const className = kind === 'warlock' ? 'Warlock' : 'Sorcerer';
  const stats = computeStats(state.level);
  const conMod = mod(stats.con);
  const avg = Math.ceil((die + 1) / 2);
  const maxHp = computeHP(state.level, stats);
  const currentHp = state.hpCurrent == null ? maxHp : state.hpCurrent;
  showConfirm(`Spend a Hit Die (${className} d${die})`,
    `<p>Roll <strong>1d${die}</strong> and add your CON modifier (<strong>${conMod >= 0 ? '+' : ''}${conMod}</strong>) to recover Hit Points.</p>
     <div style="margin:0.8rem 0;">
       <label style="font-family:'Cinzel',serif;font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--gold);display:block;margin-bottom:0.4rem;">Roll result (1–${die})</label>
       <input type="number" id="hd-roll-input" value="${avg}" min="1" max="${die}" style="width:5rem;text-align:center;padding:0.3rem;border:1px solid var(--gold-tarnish);background:rgba(255,255,255,0.6);color:var(--parchment);font-family:'Cinzel',serif;font-size:1.1rem;">
       <span style="margin-left:0.6rem;color:var(--parchment-aged);font-family:'EB Garamond',serif;font-style:italic;">+ CON ${conMod >= 0 ? '+' : ''}${conMod} = <span id="hd-heal-readout" style="color:var(--gold);font-weight:600;">${Math.max(1, avg + conMod)}</span> HP healed</span>
     </div>
     <p style="font-size:0.85rem;color:var(--parchment-aged);font-style:italic;">Current HP: ${currentHp} / ${maxHp}. Healing caps at max.</p>`,
    () => {
      const roll = parseInt(document.getElementById('hd-roll-input').value, 10) || avg;
      const heal = Math.max(1, roll + conMod);
      state[stateKey] = max - index;
      state.hpCurrent = Math.min(maxHp, currentHp + heal);
      saveState();
      render();
    },
    { okLabel: 'Spend & Heal' });
  setTimeout(() => {
    const inp = document.getElementById('hd-roll-input');
    const readout = document.getElementById('hd-heal-readout');
    if (inp && readout) {
      inp.addEventListener('input', () => {
        const r = Math.max(1, Math.min(die, parseInt(inp.value, 10) || 1));
        readout.textContent = Math.max(1, r + conMod);
      });
      inp.focus(); inp.select();
    }
  }, 0);
}

function renderCombatResources(level) {
  const { w, s } = classBreakdown(level);
  const sorcLevel = s;

  // Hit Dice — Warlock d8 pool
  const hdwRow = document.getElementById('resource-hd-warlock');
  if (w >= 1) {
    hdwRow.hidden = false;
    const max = w;
    const used = Math.min(state.hitDiceWarlockUsed || 0, max);
    const pipsContainer = document.getElementById('hd-warlock-pips');
    pipsContainer.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip' + (i < max - used ? ' filled' : '');
      pip.title = `Warlock d8 #${i + 1}`;
      pip.addEventListener('click', () => {
        const u = state.hitDiceWarlockUsed || 0;
        const isAvailable = i < max - u;
        if (isAvailable) { promptHitDieSpendCaelen('warlock', i, max); return; }
        state.hitDiceWarlockUsed = max - i - 1;
        saveState();
        render();
      });
      pipsContainer.appendChild(pip);
    }
  } else { hdwRow.hidden = true; }

  // Hit Dice — Sorcerer d6 pool
  const hdsRow = document.getElementById('resource-hd-sorcerer');
  if (s >= 1) {
    hdsRow.hidden = false;
    const max = s;
    const used = Math.min(state.hitDiceSorcererUsed || 0, max);
    const pipsContainer = document.getElementById('hd-sorcerer-pips');
    pipsContainer.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip' + (i < max - used ? ' filled' : '');
      pip.title = `Sorcerer d6 #${i + 1}`;
      pip.addEventListener('click', () => {
        const u = state.hitDiceSorcererUsed || 0;
        const isAvailable = i < max - u;
        if (isAvailable) { promptHitDieSpendCaelen('sorcerer', i, max); return; }
        state.hitDiceSorcererUsed = max - i - 1;
        saveState();
        render();
      });
      pipsContainer.appendChild(pip);
    }
  } else { hdsRow.hidden = true; }

  // Sorcery Points (sorc 2+)
  const spRow = document.getElementById('resource-sp');
  if (sorcLevel >= 2) {
    spRow.hidden = false;
    document.getElementById('sorcery-points').value = state.sorceryPoints || 0;
    document.getElementById('sorcery-points-max').textContent = sorcLevel;
  } else { spRow.hidden = true; }

  // Innate Sorcery (sorc 1+ = char L5+)
  const innateRow = document.getElementById('resource-innate');
  if (sorcLevel >= 1) {
    innateRow.hidden = false;
    const pipsContainer = document.getElementById('innate-pips');
    pipsContainer.innerHTML = '';
    const used = state.innateSorceryUsed || 0;
    const max = 2;
    for (let i = 0; i < max; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip' + (i < max - used ? ' filled' : '');
      pip.addEventListener('click', () => {
        // Used eats from the right: filled pip on click → used := max - i; empty pip on click → used := max - i - 1.
        const u = state.innateSorceryUsed || 0;
        state.innateSorceryUsed = (i < max - u) ? max - i : max - i - 1;
        saveState();
        renderCombatResources(state.level);
      });
      pipsContainer.appendChild(pip);
    }
  } else { innateRow.hidden = true; }

  // Magical Cunning (warlock 2 = char L2+)
  const cunningRow = document.getElementById('resource-cunning');
  if (level >= 2) {
    cunningRow.hidden = false;
    const btn = document.getElementById('magical-cunning-toggle');
    btn.textContent = state.magicalCunningUsed ? 'Used' : 'Available';
    btn.classList.toggle('used', !!state.magicalCunningUsed);
  } else { cunningRow.hidden = true; }

  // Heavenly Wings (Celestial Revelation L3+)
  const wingsRow = document.getElementById('resource-wings');
  if (level >= 3) {
    wingsRow.hidden = false;
    const btn = document.getElementById('heavenly-wings-toggle');
    btn.textContent = state.heavenlyWingsUsed ? 'Used' : 'Available';
    btn.classList.toggle('used', !!state.heavenlyWingsUsed);
  } else { wingsRow.hidden = true; }

  // Healing Hands (Aasimar species trait — always available from L1)
  const healingHandsBtn = document.getElementById('healing-hands-toggle');
  healingHandsBtn.textContent = state.healingHandsUsed ? 'Used' : 'Available';
  healingHandsBtn.classList.toggle('used', !!state.healingHandsUsed);

  // Luck Points (Lucky feat, only if chosen at L16 — gate the same way other
  // conditional feat-driven UI checks state.alternates for the chosen option)
  const luckRow = document.getElementById('resource-luck');
  const luckyTaken = level >= 16 && (state.alternates['lvl16-feat'] || 'warcaster16') === 'lucky';
  if (luckyTaken) {
    luckRow.hidden = false;
    const pipsContainer = document.getElementById('luck-pips');
    pipsContainer.innerHTML = '';
    const used = state.luckPointsUsed || 0;
    const max = 3;
    for (let i = 0; i < max; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip' + (i < max - used ? ' filled' : '');
      pip.title = `Luck Point ${i + 1}`;
      pip.addEventListener('click', () => {
        const u = state.luckPointsUsed || 0;
        state.luckPointsUsed = (i < max - u) ? max - i : max - i - 1;
        saveState();
        renderCombatResources(state.level);
      });
      pipsContainer.appendChild(pip);
    }
  } else { luckRow.hidden = true; }

  // Hexblade's Curse (legacy XGE Hexblade subclass at warlock 1 — always available for this build)
  const curseBtn = document.getElementById('hexblade-curse-toggle');
  curseBtn.textContent = state.hexbladesCurseUsed ? 'Used' : 'Available';
  curseBtn.classList.toggle('used', !!state.hexbladesCurseUsed);

  // Heroic Inspiration (universal 2024 mechanic). Inverted semantics: "Available" = gold (good),
  // "None" = .used class to muted-red so absence is visually obvious.
  const inspBtn = document.getElementById('inspiration-toggle');
  inspBtn.textContent = state.heroicInspiration ? 'Available' : 'None';
  inspBtn.classList.toggle('used', !state.heroicInspiration);

  // Tides of Chaos (Wild Magic sorc 3+)
  const tidesRow = document.getElementById('resource-tides');
  if (sorcLevel >= 3) {
    tidesRow.hidden = false;
    const btn = document.getElementById('tides-toggle');
    btn.textContent = state.tidesOfChaosUsed ? 'Used' : 'Available';
    btn.classList.toggle('used', !!state.tidesOfChaosUsed);
  } else { tidesRow.hidden = true; }

  // Font of Magic conversion (sorc 2+)
  renderFontOfMagic(level);
}

const WILD_MAGIC_SURGES = [
  { range: '01–04', min: 1, max: 4, effect: 'Roll on this table at the start of each of your turns for the next minute, ignoring this result on subsequent rolls.' },
  { range: '05–08', min: 5, max: 8, effect: 'A creature that is Friendly toward you appears in a random unoccupied space within 60 ft. It is under the DM\'s control and disappears 1 minute later. Roll 1d4: 1 — Modron Duodrone; 2 — Flumph; 3 — Modron Monodrone; 4 — Unicorn.' },
  { range: '09–12', min: 9, max: 12, effect: 'For the next minute, you regain 5 Hit Points at the start of each of your turns.' },
  { range: '13–16', min: 13, max: 16, effect: 'Creatures have Disadvantage on saving throws against the next spell you cast in the next minute that involves a saving throw.' },
  { range: '17–20', min: 17, max: 20, effect: 'You are subjected to an effect for 1 minute (unless its description says otherwise). Roll 1d8: 1 — faint ethereal music only you and creatures within 5 ft can hear; 2 — your size increases by one category; 3 — long feather beard until you sneeze (feathers then explode); 4 — must shout when you speak; 5 — illusory butterflies flutter within 10 ft; 6 — eye on forehead grants Advantage on WIS (Perception) checks; 7 — pink bubbles float from your mouth when you speak; 8 — skin turns vibrant blue for 24h or until Remove Curse.' },
  { range: '21–24', min: 21, max: 24, effect: 'For the next minute, all your spells with a casting time of an Action have a casting time of a Bonus Action.' },
  { range: '25–28', min: 25, max: 28, effect: 'You are transported to the Astral Plane until the end of your next turn, then return to your previous space (or the nearest unoccupied one).' },
  { range: '29–32', min: 29, max: 32, effect: 'The next time you cast a damage spell within the next minute, don\'t roll the damage dice — use the max value of each die.' },
  { range: '33–36', min: 33, max: 36, effect: 'You have Resistance to all damage for the next minute.' },
  { range: '37–40', min: 37, max: 40, effect: 'You turn into a potted plant until the start of your next turn. Incapacitated and Vulnerability to all damage. At 0 HP, the pot breaks and you revert.' },
  { range: '41–44', min: 41, max: 44, effect: 'For the next minute, you can teleport up to 20 ft as a Bonus Action on each of your turns.' },
  { range: '45–48', min: 45, max: 48, effect: 'You and up to three creatures of your choice within 30 ft have the Invisible condition for 1 minute. Ends on a creature after it attacks, deals damage, or casts a spell.' },
  { range: '49–52', min: 49, max: 52, effect: 'A spectral shield hovers near you for 1 minute: +2 AC and immunity to Magic Missile.' },
  { range: '53–56', min: 53, max: 56, effect: 'You can take one extra action on this turn.' },
  { range: '57–60', min: 57, max: 60, effect: 'You cast a random spell — no Concentration required if it would normally need one; spell lasts its full duration. Roll 1d10: 1 — Confusion; 2 — Fireball; 3 — Fog Cloud; 4 — Fly (random creature within 60 ft); 5 — Grease; 6 — Levitate (self); 7 — Magic Missile (cast as a 5th-level spell); 8 — Mirror Image; 9 — Polymorph (self; failed save → Goat); 10 — See Invisibility.' },
  { range: '61–64', min: 61, max: 64, effect: 'For the next minute, any flammable nonmagical object you touch (that isn\'t worn or carried by another creature) bursts into flame, takes 1d4 Fire damage, and is burning.' },
  { range: '65–68', min: 65, max: 68, effect: 'If you die within the next hour, you immediately revive as if by Reincarnate.' },
  { range: '69–72', min: 69, max: 72, effect: 'You have the Frightened condition until the end of your next turn. The DM determines the source.' },
  { range: '73–76', min: 73, max: 76, effect: 'You teleport up to 60 ft to an unoccupied space you can see.' },
  { range: '77–80', min: 77, max: 80, effect: 'A random creature within 60 ft has the Poisoned condition for 1d4 hours.' },
  { range: '81–84', min: 81, max: 84, effect: 'You radiate Bright Light in a 30-ft radius for 1 minute. Any creature that ends its turn within 5 ft of you has the Blinded condition until the end of its next turn.' },
  { range: '85–88', min: 85, max: 88, effect: 'Up to three creatures of your choice within 30 ft take 1d10 Necrotic damage. You regain HP equal to the total dealt.' },
  { range: '89–92', min: 89, max: 92, effect: 'Up to three creatures of your choice within 30 ft take 4d10 Lightning damage.' },
  { range: '93–96', min: 93, max: 96, effect: 'You and all creatures within 30 ft have Vulnerability to Piercing damage for the next minute.' },
  { range: '97–00', min: 97, max: 100, effect: 'Roll 1d6: 1 — you regain 2d10 HP; 2 — one ally within 300 ft regains 2d10 HP; 3 — you regain your lowest-level expended spell slot; 4 — one ally within 300 ft regains their lowest-level expended spell slot; 5 — you regain all your expended Sorcery Points; 6 — all the effects of the 17–20 row affect you simultaneously.' }
];

const SLOT_COSTS = [
  { lvl: 1, cost: 2, minSorc: 2 },
  { lvl: 2, cost: 3, minSorc: 3 },
  { lvl: 3, cost: 5, minSorc: 5 },
  { lvl: 4, cost: 6, minSorc: 7 },
  { lvl: 5, cost: 7, minSorc: 9 }
];

function renderFontOfMagic(level) {
  const ui = document.getElementById('font-of-magic-ui');
  const { s } = classBreakdown(level);
  if (s < 2) { ui.hidden = true; return; }
  ui.hidden = false;

  // Slot → SP
  const slotToSp = document.getElementById('slot-to-sp-buttons');
  slotToSp.innerHTML = '';
  const sorcSlots = SORC_SLOTS[s] || [];
  for (let i = 0; i < sorcSlots.length; i++) {
    const lvl = i + 1;
    const key = `sorc${lvl}`;
    const remaining = sorcSlots[i] - (state.usedSlots[key] || 0);
    if (remaining <= 0) continue;
    const btn = document.createElement('button');
    btn.className = 'fom-btn';
    btn.textContent = `${ordinal(lvl)} → +${lvl} sp`;
    btn.title = `Burn one ${ordinal(lvl)}-level Sorcerer slot for ${lvl} Sorcery Points`;
    btn.addEventListener('click', () => {
      state.usedSlots[key] = (state.usedSlots[key] || 0) + 1;
      const max = sorcLevelForBuild();
      state.sorceryPoints = Math.min(max, (state.sorceryPoints || 0) + lvl);
      saveState();
      render();
    });
    slotToSp.appendChild(btn);
  }
  if (slotToSp.children.length === 0) {
    slotToSp.innerHTML = '<span class="fom-empty">no slots left</span>';
  }

  // SP → Slot
  const spToSlot = document.getElementById('sp-to-slot-buttons');
  spToSlot.innerHTML = '';
  const sp = state.sorceryPoints || 0;
  for (const c of SLOT_COSTS) {
    if (s < c.minSorc) continue;
    const key = `sorc${c.lvl}`;
    const used = state.usedSlots[key] || 0;
    if (sp < c.cost || used <= 0) continue;
    const btn = document.createElement('button');
    btn.className = 'fom-btn';
    btn.textContent = `${c.cost} sp → ${ordinal(c.lvl)}`;
    btn.title = `Spend ${c.cost} Sorcery Points to restore one ${ordinal(c.lvl)}-level slot`;
    btn.addEventListener('click', () => {
      state.sorceryPoints -= c.cost;
      state.usedSlots[key] = Math.max(0, (state.usedSlots[key] || 0) - 1);
      saveState();
      render();
    });
    spToSlot.appendChild(btn);
  }
  if (spToSlot.children.length === 0) {
    spToSlot.innerHTML = '<span class="fom-empty">' + (sp < 2 ? 'not enough SP' : 'nothing to restore') + '</span>';
  }
}

function sorcLevelForBuild() { return classBreakdown(state.level).s; }

// 2024 PHB: each level of Exhaustion is −2 on every d20 Test you make.
const EXHAUSTION_PENALTY_PER_LEVEL = 2;
function getExhaustionPenalty() {
  return (state.exhaustion || 0) * EXHAUSTION_PENALTY_PER_LEVEL;
}

// Conditions that reduce speed to 0 per 2024 PHB (Grappled, Paralyzed, Petrified, Prone,
// Restrained, Stunned, Unconscious all set speed to 0 or prevent movement).
function getConditionEffects() {
  const c = state.conditions || {};
  const speedZero = !!(c.grappled || c.paralyzed || c.petrified || c.prone || c.restrained || c.stunned || c.unconscious);
  const incapacitated = !!(c.incapacitated || c.paralyzed || c.petrified || c.stunned || c.unconscious);
  return { speedZero, incapacitated };
}

function getBaseSpeed(level) {
  let speed = 30;
  for (let l = 1; l <= level; l++) {
    const ld = LEVEL_DATA[l];
    if (!ld || !ld.feat) continue;
    const chosen = state.alternates[ld.feat.id] || ld.feat.default;
    if (chosen === 'speedy') speed += 10;
  }
  // Gear speed bonuses (Boots of Striding etc.)
  const gearMods = computeGearMods();
  speed += gearMods.speedBonus || 0;
  return speed;
}

function renderDeathSaves(maxHp) {
  const block = document.getElementById('death-saves');
  const currentHp = state.hpCurrent === null ? maxHp : Math.min(state.hpCurrent, maxHp);
  if (currentHp > 0) {
    block.hidden = true;
    return;
  }
  block.hidden = false;
  ['success', 'fail'].forEach(kind => {
    const container = document.getElementById('ds-' + kind);
    container.innerHTML = '';
    const stateKey = kind === 'success' ? 'deathSavesSuccess' : 'deathSavesFail';
    const current = state[stateKey] || 0;
    for (let i = 0; i < 3; i++) {
      const pip = document.createElement('div');
      pip.className = 'ds-pip ' + kind + (i < current ? ' checked' : '');
      pip.addEventListener('click', () => {
        state[stateKey] = (i < current) ? i : i + 1;
        saveState();
        render();
      });
      container.appendChild(pip);
    }
  });
}

const CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];

const CONDITION_DESCRIPTIONS = {
  blinded:       'Can\'t see. Auto-fail any ability check requiring sight. Attack rolls vs you have Advantage; your attack rolls have Disadvantage.',
  charmed:       'Can\'t attack the charmer or target them with harmful abilities. Charmer has Advantage on social checks against you.',
  deafened:      'Can\'t hear. Auto-fail any ability check requiring hearing.',
  frightened:    'Disadvantage on ability checks and attack rolls while you can see the source. Can\'t willingly move closer to the source.',
  grappled:      'Speed is 0. Ends if the grappler is Incapacitated, or if you\'re moved away by an effect.',
  incapacitated: 'Can\'t take Actions, Bonus Actions, or Reactions. Concentration breaks. Speed is 0. Auto-fail Initiative.',
  invisible:     'Concealed from sight: heavily obscured for hiding. Attack rolls vs you have Disadvantage; your attack rolls have Advantage.',
  paralyzed:     'Incapacitated + can\'t speak. Auto-fail STR and DEX saves. Attacks vs you have Advantage. Melee hits within 5 ft are crits.',
  petrified:     'Transformed into solid inanimate substance. Incapacitated. Resistance to all damage. Immune to poison, disease. Aging halts.',
  poisoned:      'Disadvantage on attack rolls and ability checks.',
  prone:         'Disadvantage on attack rolls. Attackers within 5 ft have Advantage; attackers farther than 5 ft have Disadvantage. Movement costs double to crawl.',
  restrained:    'Speed is 0. Disadvantage on attack rolls and DEX saves. Attacks vs you have Advantage.',
  stunned:       'Incapacitated. Can\'t move. Auto-fail STR and DEX saves. Attacks vs you have Advantage.',
  unconscious:   'Incapacitated + Prone. Drop everything held. Auto-fail STR and DEX saves. Attacks vs you have Advantage. Melee hits within 5 ft are crits.'
};

function renderConditions() {
  const container = document.getElementById('conditions-pills');
  container.innerHTML = '';
  for (const name of CONDITIONS) {
    const key = name.toLowerCase();
    const pill = document.createElement('button');
    pill.className = 'condition-pill' + (state.conditions[key] ? ' active' : '');
    pill.textContent = name;
    pill.title = CONDITION_DESCRIPTIONS[key] || '';
    pill.addEventListener('click', () => {
      if (state.conditions[key]) {
        showConfirm(name, `<p style="line-height:1.6">${CONDITION_DESCRIPTIONS[key] || ''}</p>`, () => {
          state.conditions[key] = false;
          saveState();
          render();
        }, { okLabel: 'Clear Condition' });
      } else {
        state.conditions[key] = true;
        saveState();
        render();
      }
    });
    container.appendChild(pill);
  }
  document.getElementById('exhaustion-level').value = state.exhaustion || 0;
  const anyActive = Object.values(state.conditions || {}).some(v => v);
  const clearBtn = document.getElementById('conditions-clear');
  if (clearBtn) clearBtn.hidden = !anyActive && (state.exhaustion || 0) === 0;
}

function renderConcentrationOptions(level) {
  const sel = document.getElementById('concentration-select');
  sel.innerHTML = '<option value="">— not concentrating —</option>';
  for (const sp of SPELLS) {
    if (!sp.concentration) continue;
    if (sp.gained > level) continue;
    const opt = document.createElement('option');
    opt.value = sp.name;
    opt.textContent = `${sp.name} (${sp.level})`;
    if (state.concentratingOn === sp.name) opt.selected = true;
    sel.appendChild(opt);
  }
}

function renderSlots(level) {
  const container = document.getElementById('slots-container');
  container.innerHTML = '';
  const { w, s } = classBreakdown(level);

  // Pact slots (warlock)
  const pact = pactSlots(w);
  if (pact) {
    const row = document.createElement('div');
    row.className = 'slot-row';
    row.innerHTML = `<span class="slot-label">Pact · ${ordinal(pact.level)}</span><div class="slot-pips" data-slot="warlock"></div>`;
    container.appendChild(row);
    const pips = row.querySelector('.slot-pips');
    for (let i = 0; i < pact.count; i++) {
      const pip = document.createElement('div');
      // Filled = unused. Used slots eat from the right, so pip i is filled when i < (max - used).
      pip.className = 'pip' + (i < pact.count - (state.usedSlots.warlock || 0) ? ' filled' : '');
      pip.addEventListener('click', () => togglePip('warlock', i, pact.count));
      pips.appendChild(pip);
    }
  }

  // Sorcerer slots
  const sorcSlots = SORC_SLOTS[s] || [];
  sorcSlots.forEach((count, idx) => {
    const lvl = idx + 1;
    const key = `sorc${lvl}`;
    const row = document.createElement('div');
    row.className = 'slot-row';
    row.innerHTML = `<span class="slot-label">Sorcerer · ${ordinal(lvl)}</span><div class="slot-pips" data-slot="${key}"></div>`;
    container.appendChild(row);
    const pips = row.querySelector('.slot-pips');
    for (let i = 0; i < count; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip' + (i < count - (state.usedSlots[key] || 0) ? ' filled' : '');
      pip.addEventListener('click', () => togglePip(key, i, count));
      pips.appendChild(pip);
    }
  });

  if (!pact && sorcSlots.length === 0) {
    container.innerHTML = '<p style="font-style: italic; color: var(--parchment-aged);">No spell slots at this level.</p>';
  }
}

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function togglePip(slotKey, index, max) {
  // Used slots eat from the right, so pip i is filled when i < (max - used).
  // Click on a filled pip → use enough so this pip and everything to its right go empty: used := max - index.
  // Click on an empty pip → restore enough to refill from the left up to (but not including) this pip: used := max - index - 1.
  const used = state.usedSlots[slotKey] || 0;
  const isFilled = index < (max - used);
  state.usedSlots[slotKey] = isFilled ? (max - index) : (max - index - 1);
  saveState();
  render();
}

const SPELL_LEVEL_ORDER = { 'Cantrip': 0, '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6, '7th': 7, '8th': 8, '9th': 9 };

function renderSpells(level) {
  const tbody = document.getElementById('spells-tbody');
  tbody.innerHTML = '';
  const nextLevel = level + 1;
  // Sort by level → known-before-preview → name, so previews always sit at
  // the bottom of their own level group.
  const sorted = [...SPELLS].sort((a, b) => {
    const al = SPELL_LEVEL_ORDER[a.level], bl = SPELL_LEVEL_ORDER[b.level];
    if (al !== bl) return al - bl;
    const aIsPrev = a.gained === nextLevel ? 1 : 0;
    const bIsPrev = b.gained === nextLevel ? 1 : 0;
    if (aIsPrev !== bIsPrev) return aIsPrev - bIsPrev;
    return a.name.localeCompare(b.name);
  });
  let currentGroup = null;
  for (const spell of sorted) {
    const isKnown = spell.gained <= level;
    const isPreview = spell.gained === nextLevel;
    if (!isKnown && !isPreview) continue;

    // Insert a level-group header when the level changes
    if (spell.level !== currentGroup) {
      currentGroup = spell.level;
      const headerTr = document.createElement('tr');
      headerTr.className = 'spell-level-header';
      const label = spell.level === 'Cantrip' ? 'Cantrips' : `Level ${SPELL_LEVEL_ORDER[spell.level]}`;
      headerTr.innerHTML = `<td colspan="3">${label}</td>`;
      tbody.appendChild(headerTr);
    }

    if (isKnown) {
      const tr = document.createElement('tr');
      const isCantrip = SPELL_LEVEL_ORDER[spell.level] === 0;
      const concTag = spell.concentration ? '<span class="conc-tag-inline">C</span>' : '';

      // Cast button on the right side.
      // - Non-cantrips: standard cast (opens slot popover; concentration handoff via popover).
      // - Concentration cantrips: claim Concentration directly (no slot cost, with takeover warn).
      // - Non-concentration cantrips: no button (nothing to track).
      let castCell = '';
      if (!isCantrip) {
        const tiers = getValidSlotTiers(spell, level);
        const anyAvailable = tiers.some(t => (t.max - t.used) > 0);
        const classes = 'cast-btn' + (anyAvailable ? '' : ' no-slots');
        const titleAttr = anyAvailable ? 'Click to cast' : 'No slots available at or above this spell\'s level';
        castCell = `<button class="${classes}" data-spell="${spell.name}" title="${titleAttr}">Cast</button>`;
      } else if (spell.concentration) {
        const isConc = state.concentratingOn === spell.name;
        castCell = `<button class="cast-btn cantrip-cast${isConc ? ' concentrating' : ''}" data-spell="${spell.name}" title="${isConc ? 'Click to end Concentration' : 'Claim Concentration on this cantrip'}">${isConc ? 'Concentrating' : 'Cast (Conc.)'}</button>`;
      }

      tr.innerHTML = `
        <td class="spell-name-cell"><button class="spell-info-btn" data-spell="${spell.name}" title="Spell details">${spell.name}${concTag}</button></td>
        <td class="spell-source-cell">${spell.class || ''}</td>
        <td class="spell-action-cell">${castCell}</td>
      `;
      const btn = tr.querySelector('.cast-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          // Concentration cantrip: no slot popover, claim/release Concentration directly
          if (btn.classList.contains('cantrip-cast')) {
            if (state.concentratingOn === spell.name) {
              state.concentratingOn = null;
              saveState();
              render();
              return;
            }
            const finalize = () => {
              state.concentratingOn = spell.name;
              saveState();
              render();
            };
            if (state.concentratingOn && state.concentratingOn !== spell.name) {
              showConfirm('Break Concentration?',
                `<p>Casting <strong>${spell.name}</strong> will break your current Concentration on <strong>${state.concentratingOn}</strong>.</p><p>Continue?</p>`,
                finalize,
                { okLabel: `Cast ${spell.name}` });
              return;
            }
            finalize();
            return;
          }
          openCastPopover(spell, btn);
        });
      }
      const infoBtn = tr.querySelector('.spell-info-btn');
      if (infoBtn) {
        infoBtn.addEventListener('click', () => showSpellInfo(spell));
      }
      tbody.appendChild(tr);
    } else {
      // Preview row for the next level
      const tr = document.createElement('tr');
      tr.className = 'preview';
      tr.innerHTML = `
        <td class="spell-name-cell">${spell.name}<span class="preview-tag">Next Level</span></td>
        <td class="spell-source-cell">${spell.class || ''}</td>
        <td class="spell-action-cell"></td>
      `;
      tbody.appendChild(tr);
    }
  }
}

// ============================================================
// CAST POPOVER
// ============================================================

function getValidSlotTiers(spell, level) {
  const minLevel = SPELL_LEVEL_ORDER[spell.level];
  if (!minLevel) return []; // cantrip
  const { w, s } = classBreakdown(level);
  const tiers = [];
  const pact = pactSlots(w);
  if (pact && pact.level >= minLevel) {
    tiers.push({
      key: 'warlock',
      label: `Pact (${ordinal(pact.level)})`,
      max: pact.count,
      used: state.usedSlots.warlock || 0
    });
  }
  const sorcSlots = SORC_SLOTS[s] || [];
  for (let i = 0; i < sorcSlots.length; i++) {
    const lvl = i + 1;
    if (lvl < minLevel) continue;
    const key = `sorc${lvl}`;
    tiers.push({
      key,
      label: `Sorcerer ${ordinal(lvl)}`,
      max: sorcSlots[i],
      used: state.usedSlots[key] || 0
    });
  }
  return tiers;
}

function openCastPopover(spell, anchor) {
  if (IS_DM) return;
  const pop = document.getElementById('cast-popover');
  pop.innerHTML = '';
  // Transient per-open selection — resets every time the popover opens.
  const selectedMetamagic = new Set();

  const title = document.createElement('div');
  title.className = 'cast-popover-title';
  title.textContent = `Cast ${spell.name} with`;
  pop.appendChild(title);

  // Metamagic toggles — only options Caelen actually knows (Font of Magic L6
  // grants Quickened + Subtle; L14 adds a 3rd, see LEVEL_DATA[14].feat).
  const knownMeta = getKnownMetamagicIds(state.level);
  const metaRows = [];
  let updateMetaAffordability = () => {};
  if (knownMeta.length > 0) {
    const metaWrap = document.createElement('div');
    metaWrap.className = 'cast-popover-metamagic';
    const label = document.createElement('div');
    label.className = 'cast-popover-metamagic-label';
    label.innerHTML = `Metamagic (<span id="cast-popover-sp-left">${state.sorceryPoints || 0}</span> SP available)`;
    metaWrap.appendChild(label);
    for (const id of knownMeta) {
      const optDef = METAMAGIC_OPTIONS[id];
      // Twinned Spell's cost is the spell's level (min 1), not a flat number.
      const cost = id === 'twinned' ? Math.max(1, SPELL_LEVEL_ORDER[spell.level] || 1) : optDef.cost;
      const row = document.createElement('label');
      row.className = 'cast-popover-metamagic-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      const span = document.createElement('span');
      span.textContent = `Apply ${optDef.name} (−${cost} SP)`;
      row.appendChild(cb);
      row.appendChild(span);
      metaWrap.appendChild(row);
      metaRows.push({ id, cost, cb });
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', () => {
        if (cb.checked) selectedMetamagic.add(id); else selectedMetamagic.delete(id);
        updateMetaAffordability();
      });
    }
    pop.appendChild(metaWrap);

    // Grey out (and disable) any not-yet-checked option that would exceed
    // remaining Sorcery Points if added on top of what's already selected.
    updateMetaAffordability = () => {
      const spTotal = state.sorceryPoints || 0;
      const selectedCost = [...selectedMetamagic].reduce((sum, id) => sum + (metaRows.find(r => r.id === id)?.cost || 0), 0);
      for (const r of metaRows) {
        r.cb.disabled = !r.cb.checked && (selectedCost + r.cost) > spTotal;
      }
      const spLeftEl = document.getElementById('cast-popover-sp-left');
      if (spLeftEl) spLeftEl.textContent = Math.max(0, spTotal - selectedCost);
    };
    updateMetaAffordability();
  }

  const tiers = getValidSlotTiers(spell, state.level);
  const usable = tiers.filter(t => (t.max - t.used) > 0);

  if (usable.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'cast-popover-empty';
    empty.textContent = 'No slots available';
    pop.appendChild(empty);
  } else {
    for (const t of usable) {
      const remaining = t.max - t.used;
      const opt = document.createElement('button');
      opt.className = 'cast-popover-option';
      opt.innerHTML = `<span>${t.label}</span><span class="tier-count">×${remaining}</span>`;
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const metaCost = [...selectedMetamagic].reduce((sum, id) => sum + (metaRows.find(r => r.id === id)?.cost || 0), 0);
        if (metaCost > (state.sorceryPoints || 0)) return; // guarded by disabled checkboxes; belt-and-suspenders
        const finalize = () => {
          state.usedSlots[t.key] = (state.usedSlots[t.key] || 0) + 1;
          if (metaCost > 0) state.sorceryPoints = Math.max(0, (state.sorceryPoints || 0) - metaCost);
          if (spell.concentration) state.concentratingOn = spell.name;
          saveState();
          closeCastPopover();
          render();
        };
        // Concentration handoff: warn if taking over from a different spell
        if (spell.concentration && state.concentratingOn && state.concentratingOn !== spell.name) {
          closeCastPopover();
          showConfirm('Break Concentration?',
            `<p>Casting <strong>${spell.name}</strong> will break your current Concentration on <strong>${state.concentratingOn}</strong>.</p><p>Continue?</p>`,
            finalize,
            { okLabel: `Cast ${spell.name}` });
          return;
        }
        finalize();
      });
      pop.appendChild(opt);
    }
  }

  // Position near anchor (with right-edge clamping)
  pop.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const popWidth = pop.offsetWidth;
  let leftPx = rect.left;
  if (leftPx + popWidth > window.innerWidth - 12) {
    leftPx = Math.max(12, window.innerWidth - popWidth - 12);
  }
  pop.style.left = leftPx + 'px';
  pop.style.top = (rect.bottom + 6) + 'px';

  // Close on next outside click (defer so this click doesn't immediately close it)
  setTimeout(() => document.addEventListener('click', closeOnOutsideClick), 0);
}

function closeCastPopover() {
  const pop = document.getElementById('cast-popover');
  pop.hidden = true;
  document.removeEventListener('click', closeOnOutsideClick);
}

function closeOnOutsideClick(e) {
  const pop = document.getElementById('cast-popover');
  if (pop.contains(e.target)) return;
  closeCastPopover();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCastPopover();
});

// ============================================================
// Styled confirm / info modal helpers (ported from Rivet)
// ============================================================
let _confirmCallback = null;
function showConfirm(title, bodyHTML, onConfirm, opts = {}) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-body').innerHTML = bodyHTML;
  document.getElementById('confirm-ok').textContent = opts.okLabel || 'Confirm';
  document.getElementById('confirm-cancel').textContent = opts.cancelLabel || 'Cancel';
  document.getElementById('confirm-cancel').hidden = !!opts.infoOnly;
  _confirmCallback = onConfirm;
  document.getElementById('confirm-overlay').hidden = false;
}
function showInfo(title, bodyHTML) {
  showConfirm(title, bodyHTML, null, { okLabel: 'Close', infoOnly: true });
}
function showSpellInfo(spell) {
  // Caelen's spell shape: { name, level, class, gained, notes, concentration? }
  // Full 2024 PHB description (if available) lives in SPELL_DETAILS keyed by name.
  const details = (typeof SPELL_DETAILS !== 'undefined') ? SPELL_DETAILS[spell.name] : null;
  const subtitle = details
    ? details.schoolClass
    : `${spell.level} · ${spell.class || ''}${spell.concentration ? ' · Concentration' : ''}`;

  // Build the metadata grid (Casting Time / Range / Components / Duration)
  let metaGrid = '';
  if (details) {
    metaGrid = `
      <dl class="spell-info-grid">
        <dt>Casting Time</dt><dd>${details.time}</dd>
        <dt>Range</dt><dd>${details.range}</dd>
        <dt>Components</dt><dd>${details.components}</dd>
        <dt>Duration</dt><dd>${details.duration}</dd>
      </dl>
    `;
  }

  // Body: full description if we have it, fall back to the short notes
  let body = '';
  if (details && details.desc) {
    // Split on double-newline into paragraphs; "Higher Level" / "Cantrip Upgrade" lines get italics
    const paragraphs = details.desc.split('\n\n').map(p => p.trim()).filter(Boolean);
    body = paragraphs.map(p => {
      const isUpgrade = /^(Cantrip Upgrade|Using a Higher-Level Spell Slot|Higher Level)/.test(p);
      const cls = isUpgrade ? 'spell-info-upgrade' : 'spell-info-para';
      return `<p class="${cls}">${escapeForSpellInfo(p)}</p>`;
    }).join('');
  } else if (spell.notes) {
    body = `<p class="spell-info-para">${spell.notes}</p>`;
  }

  showInfo(spell.name, `<div class="spell-info-subtitle">${subtitle}</div>${metaGrid}${body}`);
}
// Escape user-facing spell description body. Keep most punctuation, just
// neutralise the angle brackets so any stray tags don't render.
function escapeForSpellInfo(text) {
  return text.replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]));
}
function closeConfirmModal() {
  document.getElementById('confirm-overlay').hidden = true;
  _confirmCallback = null;
}
document.getElementById('confirm-ok').addEventListener('click', () => {
  const cb = _confirmCallback;
  closeConfirmModal();
  if (cb) cb();
});
document.getElementById('confirm-close').addEventListener('click', closeConfirmModal);
document.getElementById('confirm-cancel').addEventListener('click', closeConfirmModal);
document.getElementById('confirm-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'confirm-overlay') closeConfirmModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('confirm-overlay').hidden) closeConfirmModal();
});

function renderClassFeatures(level) {
  const container = document.getElementById('class-features');
  container.innerHTML = '';
  let hidden = 0;
  for (const f of CLASS_FEATURES) {
    if (f.level > level) { hidden++; continue; }
    const block = document.createElement('div');
    block.className = 'feature-block';
    block.setAttribute('data-level', f.level);
    // Metamagic's known-options list grows at L14 — build it dynamically
    // instead of using the static desc so the 3rd pick actually shows up.
    let desc = f.desc;
    if (f.id === 'metamagic') {
      const known = getKnownMetamagicIds(level).map(id => METAMAGIC_OPTIONS[id].name);
      desc = `Known: ${known.join(', ')}. Applied and paid for (Sorcery Points) at cast time via the Cast popover on a spell.`;
    }
    block.innerHTML = `<h4>${f.name}</h4><p><em>(${f.source})</em> ${desc}</p>`;
    container.appendChild(block);
  }
  if (hidden > 0) {
    const note = document.createElement('p');
    note.style.cssText = 'font-style:italic;color:var(--parchment-dim);font-size:0.85rem;margin-top:1rem;text-align:center;';
    note.textContent = `+ ${hidden} more feature${hidden === 1 ? '' : 's'} at higher levels`;
    container.appendChild(note);
  }
}

function renderAlternates(level) {
  const container = document.getElementById('alternates-list');
  container.innerHTML = '';

  let any = false;
  for (let l = 1; l <= level; l++) {
    const ld = LEVEL_DATA[l];
    if (!ld || !ld.feat) continue;
    any = true;
    const feat = ld.feat;
    const chosen = state.alternates[feat.id] || feat.default;

    const wrapper = document.createElement('div');
    wrapper.className = 'alt-control';
    wrapper.innerHTML = `<div class="alt-title">Level ${l} · ${feat.label}</div>`;

    for (const opt of feat.options) {
      const label = document.createElement('label');
      const id = `${feat.id}-${opt.id}`;
      label.innerHTML = `<input type="radio" name="${feat.id}" value="${opt.id}" ${chosen === opt.id ? 'checked' : ''}><span><strong>${opt.name}</strong> — ${opt.effect}</span>`;
      wrapper.appendChild(label);
    }
    container.appendChild(wrapper);
  }

  // Listen for radio changes
  container.querySelectorAll('input[type=radio]').forEach(r => {
    r.addEventListener('change', () => {
      state.alternates[r.name] = r.value;
      saveState();
      render();
    });
  });

  if (!any) {
    container.innerHTML = '<p style="color: var(--parchment-aged); font-style: italic;">First feat decision at level 4.</p>';
  }
}

function renderCombatLoops(level) {
  const container = document.getElementById('combat-loops');
  container.innerHTML = '';
  for (const loop of COMBAT_LOOPS) {
    if (loop.minLevel > level) continue;
    // Don't show "Standard Turn (Levels 1-6)" if we have the level 7+ version
    if (loop.name.includes('1-6') && level >= 7) continue;
    const div = document.createElement('div');
    div.className = 'loop';
    div.innerHTML = `<div class="loop-name">${loop.name}</div><p>${loop.desc}</p>`;
    container.appendChild(div);
  }
}

function renderLevelTable(currentLevel) {
  const tbody = document.getElementById('level-table-body');
  tbody.innerHTML = '';
  for (let l = 1; l <= 20; l++) {
    const ld = LEVEL_DATA[l];
    const tr = document.createElement('tr');
    if (l === currentLevel) tr.className = 'current';
    else if (l > currentLevel) tr.className = 'future';
    const classStr = ld.warlock > 0 && ld.sorcerer === 0
      ? `Hexblade Warlock ${ld.warlock}`
      : ld.sorcerer > 0 && ld.warlock === 0
        ? `Wild Magic Sorcerer ${ld.sorcerer}`
        : `Warlock ${ld.warlock} / Sorcerer ${ld.sorcerer}`;
    tr.innerHTML = `<td><strong>${l}</strong></td><td>${classStr}</td><td>${ld.classGain}</td>`;
    tbody.appendChild(tr);
  }
}

// ============================================================
// GEAR — structured inventory with equip / attune / magical effects
// ============================================================

// Render the Weapon Attacks card from equipped weapons in state.gear.
// Caelen-specific: weapons with ability='cha' use his Hex Warrior CHA-mod
// (bonded Sickle, Pact of the Blade). Magic weapons stack attackBonus/damageBonus.
// Hidden card if no equipped weapons.
function renderWeaponAttacks(level, stats, pb) {
  const card = document.getElementById('weapon-attacks-card');
  if (!card) return;
  const list = document.getElementById('weapon-attacks-list');
  const blurb = document.getElementById('weapon-attacks-blurb');
  list.innerHTML = '';
  const equipped = (state.gear || []).filter(g => g.type === 'weapon' && g.equipped);
  if (equipped.length === 0) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  const exhaustPen = (state.conditions && state.conditions.exhaustion) ? Math.min(6, state.conditions.exhaustion) : 0;
  const chaMod = mod(stats.cha);
  // Hex Warrior is L1+ for Caelen. Hexblade's Curse extra damage per hit = PB to a cursed target.
  blurb.innerHTML = `Proficiency <strong>+${pb}</strong> · CHA mod <strong>${fmtMod(chaMod)}</strong> (Hex Warrior bonds use CHA in place of STR/DEX). On a cursed target add <strong>+${pb}</strong> damage and crit on 19-20 (Hexblade's Curse).`;
  for (const wpn of equipped) {
    // Resolve ability: 'cha' → CHA (Hex Warrior bonded), 'finesse' → best of STR/DEX, else 'str'/'dex'.
    let ability;
    if (wpn.ability === 'finesse') ability = mod(stats.dex) >= mod(stats.str) ? 'dex' : 'str';
    else if (wpn.ability === 'cha' || wpn.ability === 'dex' || wpn.ability === 'str' || wpn.ability === 'int') ability = wpn.ability;
    else ability = 'str';
    const abilityMod = mod(stats[ability]);
    const damageDie = wpn.damage || '1d4';
    const damageType = wpn.damageType || 'slashing';
    const attBonus = wpn.attackBonus || 0;
    const dmgBonus = wpn.damageBonus || 0;
    const toHit = pb + abilityMod + attBonus - exhaustPen;
    const dmgStr = `${esc(damageDie)} + ${abilityMod + dmgBonus} ${esc(damageType)}`;
    const tagParts = [];
    if (attBonus || dmgBonus) tagParts.push(`<span class="weapon-tag-magic">Magic +${Math.max(attBonus, dmgBonus)}</span>`);
    if (wpn.mastery) tagParts.push(`<span class="weapon-tag-mastery has-tip" title="${(WEAPON_MASTERIES[wpn.mastery] || '').replace(/"/g, '&quot;')}">${esc(wpn.mastery)}</span>`);
    if (wpn.quantity && wpn.quantity > 1) tagParts.push(`×${wpn.quantity}`);
    const block = document.createElement('div');
    block.className = 'weapon-attack-block';
    block.innerHTML = `
      <h4>${esc(wpn.name)}${tagParts.length ? ' <span class="weapon-attack-tags">' + tagParts.join(' · ') + '</span>' : ''}</h4>
      <p style="font-family:'Cinzel',serif;color:var(--gold);letter-spacing:0.05em;margin-bottom:0.3rem;">
        ${fmtMod(toHit)} to hit · ${dmgStr}
        <span style="font-family:'Cinzel',serif;font-size:0.7rem;color:var(--gold-tarnish);letter-spacing:0.1em;margin-left:0.5rem;">${ability.toUpperCase()}${attBonus || dmgBonus ? ' · magic' : ''}</span>
      </p>
      ${wpn.properties ? `<p style="font-size:0.78rem;color:var(--parchment-aged);">${esc(wpn.properties)}</p>` : ''}
      ${wpn.notes ? `<p style="font-size:0.78rem;color:var(--parchment-aged);font-style:italic;">${esc(wpn.notes)}</p>` : ''}
    `;
    list.appendChild(block);
  }
}

// Render the Senses defense-cell: Passive Perception + species + gear-granted
// senses (Darkvision, etc.). Called from render() right after stats are computed.
function renderSensesCard(stats) {
  const sensesEl = document.getElementById('senses-passive');
  const subEl = document.getElementById('senses-sub');
  const extraEl = document.getElementById('senses-extra');
  if (!sensesEl) return;
  const wisMod = mod(stats.wis);
  const perceptionProf = (state.skillProfs || []).includes('Perception');
  const pb = profBonus(state.level || 1);
  // Observant feat: +5 to passive Perception
  const hasObservant = (state.feats || []).some(f => f.name === 'Observant');
  const passivePerc = 10 + wisMod + (perceptionProf ? pb : 0) + (hasObservant ? 5 : 0);
  sensesEl.textContent = passivePerc;
  subEl.textContent = perceptionProf ? `Passive Perception (prof)${hasObservant ? ' + Obs' : ''}` : `Passive Perception${hasObservant ? ' + Obs' : ''}`;
  // Species senses (per-sheet hardcode) + gear senses (Goggles of Night, etc.)
  const speciesSenses = [];
  const gearMods = computeGearMods();
  // Dedupe (preserve order): species first, then gear.
  const seen = new Set();
  const merged = [...speciesSenses, ...(gearMods.senses || [])].filter(s => { if (seen.has(s)) return false; seen.add(s); return true; });
  if (extraEl) extraEl.innerHTML = merged.length ? merged.map(esc).join('<br>') : '';
}

// One-shot computation of all bonuses contributed by currently-equipped (and
// attuned, for attunement-required items) gear. Cache-cheap; called multiple
// times per render. Pure function — only reads state.gear.
function computeGearMods() {
  const mods = {
    acBonus: 0, saveBonus: 0, hpBonus: 0, speedBonus: 0,
    attackBonus: 0, damageBonus: 0,
    statOverrides: {},               // { str: 19, ... } — set when an item overrides a stat
    equippedArmor: null,             // the equipped armor (light/medium/heavy)
    shieldEquipped: false,
    shieldAcBonus: 0,
    stealthDisadv: false,
    strReqUnmet: null,               // tracks if armor STR req is unmet (for the AC tooltip)
    senses: []                       // strings like 'Darkvision 60 ft' collected from gear (Goggles of Night, etc.)
  };
  for (const g of (state.gear || [])) {
    if (!g.equipped) continue;
    const effectsApply = !g.requiresAttunement || g.attuned;
    if (g.type === 'armor') {
      if (g.armorBase) {
        if (!mods.equippedArmor || (g.armorBase > (mods.equippedArmor.armorBase || 0))) mods.equippedArmor = g;
      }
      if (g.stealthDisadv) mods.stealthDisadv = true;
      // +1/+2/+3 armor (acBonus from a separately-equipped magical armor enhancement)
      if (effectsApply && g.acBonus) mods.acBonus += g.acBonus;
    } else if (g.type === 'shield') {
      mods.shieldEquipped = true;
      mods.shieldAcBonus = Math.max(mods.shieldAcBonus, g.acBonus || 2);
      if (effectsApply && g.acBonus && g.acBonus > 2) mods.acBonus += (g.acBonus - 2);
    } else if (effectsApply) {
      if (g.acBonus) mods.acBonus += g.acBonus;
    }
    if (effectsApply) {
      if (g.saveBonus) mods.saveBonus += g.saveBonus;
      if (g.hpBonus) mods.hpBonus += g.hpBonus;
      if (g.speedBonus) mods.speedBonus += g.speedBonus;
      if (g.senses) mods.senses.push(g.senses);
      if (g.statOverride) {
        for (const k of Object.keys(g.statOverride)) {
          const v = g.statOverride[k];
          if (!mods.statOverrides[k] || v > mods.statOverrides[k]) mods.statOverrides[k] = v;
        }
      }
    }
  }
  return mods;
}

function totalAttunedCount() {
  return (state.gear || []).filter(g => g.attuned).length
    + (state.attunedReplicas || []).length
    + (state.magicItems || []).filter(mi => mi.attuned).length;
}

// Parses simple dice strings like "2d4+2" / "8d4+8" / "1d8" into
// { count, sides, mod, min, max, avg }. Returns null if unparseable.
function parseDiceString(str) {
  const m = /^\s*(\d+)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i.exec(str || '');
  if (!m) return null;
  const count = parseInt(m[1], 10), sides = parseInt(m[2], 10);
  const mod = m[3] ? (m[3] === '-' ? -1 : 1) * parseInt(m[4], 10) : 0;
  return { count, sides, mod, min: count + mod, max: count * sides + mod, avg: Math.round(count * (sides + 1) / 2 + mod) };
}

// Using a consumable: potions with healDice prompt the player to roll their
// physical dice and enter the total, then apply it to HP and spend one from
// the stack. Everything else (Invisibility, Speed, etc.) just shows the
// effect text from Notes and spends one on confirm — no separate roll needed.
function useConsumable(g) {
  const dice = parseDiceString(g.healDice);
  if (dice) {
    const stats = computeStats(state.level);
    const maxHp = computeHP(state.level, stats);
    const currentHp = state.hpCurrent == null ? maxHp : state.hpCurrent;
    showConfirm(`Drink ${g.name}`,
      `<p>Roll <strong>${esc(g.healDice)}</strong> on your physical dice and enter the total below.</p>
       <div style="margin:0.8rem 0;">
         <label style="font-family:'Cinzel',serif;font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--gold);display:block;margin-bottom:0.4rem;">Roll result (${dice.min}–${dice.max})</label>
         <input type="number" id="consumable-roll-input" value="${dice.avg}" min="${dice.min}" max="${dice.max}" style="width:5rem;text-align:center;padding:0.3rem;border:1px solid var(--gold-tarnish);background:rgba(255,255,255,0.6);color:var(--parchment);font-family:'Cinzel',serif;font-size:1.1rem;">
         <span style="margin-left:0.6rem;color:var(--parchment-aged);font-family:'EB Garamond',serif;font-style:italic;">HP recovered</span>
       </div>
       <p style="font-size:0.85rem;color:var(--parchment-aged);font-style:italic;">Current HP: ${currentHp} / ${maxHp}. Healing caps at max.${g.notes ? '<br>' + esc(g.notes) : ''}</p>`,
      () => {
        const roll = Math.max(dice.min, Math.min(dice.max, parseInt(document.getElementById('consumable-roll-input').value, 10) || dice.avg));
        state.hpCurrent = Math.min(maxHp, currentHp + roll);
        g.quantity = Math.max(0, (g.quantity || 1) - 1);
        saveState();
        render();
      },
      { okLabel: 'Drink & Heal' });
  } else {
    showConfirm(`Use ${g.name}`,
      `<p>${g.notes ? esc(g.notes) : 'Spend one use of this item.'}</p>`,
      () => {
        g.quantity = Math.max(0, (g.quantity || 1) - 1);
        saveState();
        render();
      },
      { okLabel: 'Use (−1)' });
  }
}

function renderGear() {
  const list = document.getElementById('gear-list');
  if (!list) return;
  const allGear = state.gear || [];
  const searchEl = document.getElementById('gear-search');
  const filter = (searchEl?.value || '').toLowerCase().trim();
  const clearBtn = document.getElementById('gear-search-clear');
  if (clearBtn) clearBtn.hidden = !filter;
  const gear = filter
    ? allGear.filter(g => (g.name || '').toLowerCase().includes(filter)
                       || (g.type || '').toLowerCase().includes(filter)
                       || (g.notes || '').toLowerCase().includes(filter)
                       || (g.rarity || '').toLowerCase().includes(filter)
                       || (g.mastery || '').toLowerCase().includes(filter))
    : allGear;
  list.innerHTML = '';
  if (gear.length === 0) {
    if (filter) { list.innerHTML = `<div class="gear-empty">No items match "${filter}". <button class="link-btn" id="gear-search-reset">clear search</button></div>`; const r = document.getElementById('gear-search-reset'); if (r) r.addEventListener('click', () => { searchEl.value = ''; renderGear(); }); return; }
    list.innerHTML = '<div class="gear-empty">Nothing here yet. Click <strong>+ Add Item</strong> to add armor, weapons, potions, or magic items.</div>';
  }
  // Sort: equipped first (armor → shield → weapon), then by type, then by name
  const typeOrder = { armor: 0, shield: 1, weapon: 2, cloak: 3, ring: 4, amulet: 5, boots: 6, wondrous: 7, consumable: 8, wand: 9, rod: 10, misc: 99 };
  const sorted = [...gear].sort((a, b) => {
    if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
    const ta = typeOrder[a.type] ?? 50, tb = typeOrder[b.type] ?? 50;
    if (ta !== tb) return ta - tb;
    return (a.name || '').localeCompare(b.name || '');
  });
  for (const g of sorted) {
    const h = escFields(g); // display-safe copy; `g` stays the live object for handlers
    const row = document.createElement('div');
    row.className = 'gear-row' + (h.equipped ? ' equipped' : '');
    const metaParts = [];
    if (h.quantity && (h.quantity > 1 || h.type === 'consumable')) metaParts.push(`×${h.quantity}`);
    if (h.weight) metaParts.push(`${h.weight} lb`);
    if (h.rarity && h.rarity !== 'Mundane') metaParts.push(h.rarity);
    if (h.type === 'armor' && h.armorBase) metaParts.push(`AC ${h.armorBase} (${h.armorType || '?'})`);
    if (h.type === 'weapon' && h.damage) metaParts.push(`${h.damage} ${h.damageType || ''}`);
    if (h.type === 'shield' && h.acBonus) metaParts.push(`+${h.acBonus} AC`);
    if (h.type === 'consumable' && h.healDice) metaParts.push(`heals ${h.healDice}`);
    const effects = [];
    if (h.acBonus && h.type !== 'shield' && h.type !== 'armor') effects.push(`+${h.acBonus} AC`);
    if (h.saveBonus) effects.push(`+${h.saveBonus} saves`);
    if (h.attackBonus) effects.push(`+${h.attackBonus} hit`);
    if (h.damageBonus) effects.push(`+${h.damageBonus} dmg`);
    if (h.hpBonus) effects.push(`+${h.hpBonus} HP`);
    if (h.speedBonus) effects.push(`+${h.speedBonus} ft Speed`);
    if (h.statOverride) effects.push(...Object.entries(h.statOverride).map(([k, v]) => `${esc(k.toUpperCase())} → ${esc(v)}`));
    const chargesHtml = h.chargesMax ? `<div class="gear-charges-row">
        <span class="gear-meta">Charges: <strong>${h.chargesMax - (h.chargesUsed || 0)}</strong> / ${h.chargesMax}${h.chargesRecover ? ' · recovers on ' + h.chargesRecover : ''}</span>
        <button class="gear-charge-btn" data-charge-act="spend" title="Spend 1 charge">−1</button>
        <button class="gear-charge-btn" data-charge-act="restore" title="Restore 1 charge">+1</button>
        <button class="gear-charge-btn" data-charge-act="full" title="Refill all charges">refill</button>
      </div>` : '';
    // Equip pill — shown for every non-consumable item. For armor/shield/weapon/
    // magic-effect items it drives mechanical stats; for misc items it's just a
    // 'worn/carried' marker. Potions/scrolls aren't "worn", so they skip this.
    const mechanical = ['armor', 'shield', 'weapon'].includes(h.type)
                    || h.acBonus || h.saveBonus || h.attackBonus || h.damageBonus
                    || h.hpBonus || h.speedBonus || h.statOverride;
    const equipLabel = mechanical
      ? (h.equipped ? '✓ Equipped' : 'Equip')
      : (h.equipped ? '✓ Worn' : 'Wear');
    const equipPill = h.type === 'consumable' ? '' : `<button class="gear-toggle equip ${h.equipped ? 'on' : ''}" title="${mechanical ? 'Equip to apply this item\'s mechanical effects (AC, attacks, etc.)' : 'Mark as currently worn / carried (no mechanical effect for misc items)'}">${equipLabel}</button>`;
    // Attune pill — only shown for items that require attunement.
    const attunePill = h.requiresAttunement
      ? `<button class="gear-toggle attune ${h.attuned ? 'on' : ''}" title="Attune (3 max — magic effects only apply when attuned)">${h.attuned ? '✦ Attuned' : 'Attune'}</button>`
      : '';
    const empty = h.type === 'consumable' && !(h.quantity > 0);
    const useBtn = h.type === 'consumable'
      ? `<button class="gear-use-btn" ${empty ? 'disabled' : ''}>${empty ? 'Empty' : 'Use'}</button>`
      : '';
    row.innerHTML = `
      <div class="gear-toggles">${equipPill}${attunePill}</div>
      <div class="gear-main">
        <div><span class="gear-type">${h.type}</span><span class="gear-name">${h.name}</span></div>
        ${metaParts.length ? `<div class="gear-meta">${metaParts.join(' · ')}</div>` : ''}
        ${effects.length ? `<div class="gear-meta" style="color:var(--gold);">Effects: ${effects.join(' · ')}</div>` : ''}
        ${chargesHtml}
        ${h.notes ? `<div class="gear-meta" style="font-style:italic;">${h.notes}</div>` : ''}
      </div>
      <div class="gear-actions">
        ${useBtn}
        <button class="gear-edit-btn">Edit</button>
        <button class="gear-del-btn">Delete</button>
      </div>
    `;
    const useButton = row.querySelector('.gear-use-btn');
    if (useButton) useButton.addEventListener('click', () => useConsumable(g));
    const equipBtn = row.querySelector('.gear-toggle.equip');
    if (equipBtn) equipBtn.addEventListener('click', () => {
      g.equipped = !g.equipped;
      saveState();
      render();
    });
    const attuneBtn = row.querySelector('.gear-toggle.attune');
    if (attuneBtn) attuneBtn.addEventListener('click', () => {
      if (!g.requiresAttunement) return;
      if (!g.attuned) {
        const currentAttuned = totalAttunedCount();
        if (currentAttuned >= 3) {
          alert('Attunement cap reached (3). Unattune another item first.');
          return;
        }
      }
      g.attuned = !g.attuned;
      saveState();
      render();
    });
    // Charge buttons (only present when chargesMax > 0)
    row.querySelectorAll('.gear-charge-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.chargeAct;
        const max = g.chargesMax || 0;
        let used = g.chargesUsed || 0;
        if (act === 'spend') used = Math.min(max, used + 1);
        else if (act === 'restore') used = Math.max(0, used - 1);
        else if (act === 'full') used = 0;
        g.chargesUsed = used;
        saveState();
        render();
      });
    });
    row.querySelector('.gear-edit-btn').addEventListener('click', () => openGearModal(g));
    row.querySelector('.gear-del-btn').addEventListener('click', () => {
      if (!confirm(`Remove "${g.name}" from gear?`)) return;
      state.gear = (state.gear || []).filter(x => x.id !== g.id);
      saveState();
      render();
    });
    list.appendChild(row);
  }
  // Attunement counter in card header
  const counter = document.getElementById('gear-attunement-counter');
  if (counter) {
    const attCount = (state.gear || []).filter(g => g.attuned).length;
    counter.textContent = `Attuned: ${attCount} / 3`;
    counter.style.color = attCount >= 3 ? 'var(--silver-crack)' : 'var(--parchment-aged)';
  }
}

// ============================================================
// Transfer modal — send one or more gear items to a party member at once.
// Replaces the old per-row "Give →" select: real play means handing over a
// pile of looted items in one go, not one dropdown at a time.
// ============================================================
let _transferRecipient = null;   // rowId of the chosen party member, or null
let _transferSelections = {};    // itemId -> quantity to send (only checked items)

function openTransferModal() {
  _transferRecipient = null;
  _transferSelections = {};
  renderTransferRecipients();
  renderTransferItemList();
  updateTransferControls();
  document.getElementById('transfer-overlay').hidden = false;
}

function closeTransferModal() {
  document.getElementById('transfer-overlay').hidden = true;
  _transferRecipient = null;
  _transferSelections = {};
}

function renderTransferRecipients() {
  const wrap = document.getElementById('transfer-recipients');
  if (!wrap) return;
  wrap.innerHTML = PARTY_MEMBERS.map(p => `
    <label>
      <input type="radio" name="transfer-recipient" value="${p.rowId}">
      <span>${p.name}</span>
    </label>
  `).join('');
  wrap.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      _transferRecipient = radio.value;
      updateTransferControls();
    });
  });
}

function renderTransferItemList() {
  const list = document.getElementById('transfer-item-list');
  if (!list) return;
  const gear = state.gear || [];
  if (gear.length === 0) {
    list.innerHTML = '<div class="transfer-empty">No gear to send.</div>';
    return;
  }
  const sorted = [...gear].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  list.innerHTML = sorted.map(g => {
    const stackable = !!(g.quantity && g.quantity > 1);
    const stepper = stackable
      ? `<input type="number" class="transfer-item-qty" data-item-id="${esc(g.id)}" min="1" max="${esc(g.quantity)}" value="1" disabled>`
      : '';
    return `
      <div class="transfer-item-row">
        <label>
          <input type="checkbox" class="transfer-item-check" data-item-id="${esc(g.id)}">
          <span class="transfer-item-name">${esc(g.name)}</span>
          <span class="gear-type">${esc(g.type)}</span>
          ${stackable ? `<span class="gear-meta">×${esc(g.quantity)} owned</span>` : ''}
        </label>
        ${stepper}
      </div>
    `;
  }).join('');
  list.querySelectorAll('.transfer-item-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.itemId;
      const row = cb.closest('.transfer-item-row');
      const qtyInput = row ? row.querySelector('.transfer-item-qty') : null;
      if (cb.checked) {
        const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
        _transferSelections[id] = qty;
        if (qtyInput) qtyInput.disabled = false;
      } else {
        delete _transferSelections[id];
        if (qtyInput) qtyInput.disabled = true;
      }
      updateTransferControls();
    });
  });
  list.querySelectorAll('.transfer-item-qty').forEach(input => {
    input.addEventListener('input', () => {
      const id = input.dataset.itemId;
      if (!(id in _transferSelections)) return;
      const max = parseInt(input.max, 10) || 1;
      let val = parseInt(input.value, 10) || 1;
      val = Math.min(Math.max(1, val), max);
      input.value = val;
      _transferSelections[id] = val;
    });
  });
}

// Nothing in the modal is usable until a recipient is picked; the Send
// button additionally needs at least one checked item.
function updateTransferControls() {
  const hasRecipient = !!_transferRecipient;
  const list = document.getElementById('transfer-item-list');
  if (list) {
    list.classList.toggle('is-disabled', !hasRecipient);
    list.querySelectorAll('.transfer-item-check').forEach(cb => { cb.disabled = !hasRecipient; });
    list.querySelectorAll('.transfer-item-qty').forEach(input => {
      const checked = Object.prototype.hasOwnProperty.call(_transferSelections, input.dataset.itemId);
      input.disabled = !hasRecipient || !checked;
    });
  }
  const sendBtn = document.getElementById('transfer-send');
  if (sendBtn) sendBtn.disabled = !(hasRecipient && Object.keys(_transferSelections).length > 0);
}

// Sends every checked item to the chosen recipient. Posts each transfer
// first and only mutates state.gear for items whose POST actually succeeded
// — a failure on one item never costs the player items that went through
// fine. Saves/renders/closes on completion even if some sends failed, then
// reports which ones failed so nothing is silently lost.
async function sendTransferSelections() {
  const target = PARTY_MEMBERS.find(p => p.rowId === _transferRecipient);
  const entries = Object.entries(_transferSelections);
  if (!target || entries.length === 0) return;

  const sendBtn = document.getElementById('transfer-send');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending…'; }

  const succeeded = []; // { id, qtySent, stackable }
  const failed = [];    // item names, for the failure report

  for (const [itemId, qty] of entries) {
    const g = (state.gear || []).find(x => x.id === itemId);
    if (!g) continue;
    const stackable = !!(g.quantity && g.quantity > 1);
    const qtyToSend = stackable ? Math.min(Math.max(1, qty), g.quantity) : 1;
    const itemToSend = stackable
      ? { ...g, quantity: qtyToSend, equipped: false, attuned: false }
      : { ...g, quantity: 1, equipped: false, attuned: false };
    try {
      await postItemTransfer(target.rowId, itemToSend);
      succeeded.push({ id: itemId, qtySent: qtyToSend, stackable, name: g.name });
    } catch (e) {
      console.error('item transfer failed', e);
      failed.push(g.name);
    }
  }

  for (const s of succeeded) {
    const g = (state.gear || []).find(x => x.id === s.id);
    if (!g) continue;
    if (s.stackable) {
      g.quantity -= s.qtySent;
      if (g.quantity <= 0) state.gear = state.gear.filter(x => x.id !== s.id);
    } else {
      state.gear = (state.gear || []).filter(x => x.id !== s.id);
    }
  }

  if (sendBtn) sendBtn.textContent = 'Send';
  saveState();
  render();
  closeTransferModal();

  if (failed.length) {
    const failedHtml = failed.map(n => `<li>${n}</li>`).join('');
    showInfo('Some Transfers Failed', `<p>Sent to ${target.name}, except:</p><ul style="line-height:1.7;">${failedHtml}</ul><p>Those items were not removed from your gear — check your connection and try again.</p>`);
  }
}

// Show a combined "Accept All" modal for pending item transfers addressed to
// this character (checked once per page load, from initCloudSync). A single
// combined accept is simpler than a per-item button list and fits the
// existing single-callback showConfirm pattern; declining just leaves the
// transfers unclaimed so they're offered again next load.
function showTransferInbox(pending) {
  const itemsHtml = pending.map(t => {
    const itemName = esc((t.item && t.item.name) || 'Unknown item');
    const fromName = esc(t.from_name || 'a party member');
    return `<li>🎁 <strong>${itemName}</strong> from ${fromName}</li>`;
  }).join('');
  showConfirm('Incoming Gifts',
    `<p>Waiting for you:</p><ul style="line-height:1.7;">${itemsHtml}</ul>`,
    () => acceptAllTransfers(pending),
    { okLabel: 'Accept All' });
}

// Claims each pending transfer first and only adds the item to state.gear
// once the claim succeeds (with a fresh id so it can't collide with an
// existing gear entry). A gift that was already claimed elsewhere is
// skipped; one whose claim fails (offline) stays pending and is offered
// again next load. Either way an item can't land twice.
async function acceptAllTransfers(pending) {
  state.gear = state.gear || [];
  let added = 0, skipped = 0, failed = 0;
  for (let i = 0; i < pending.length; i++) {
    const t = pending[i];
    try {
      const claimed = await claimTransfer(t.id);
      if (!claimed) { skipped++; continue; }
    } catch (e) {
      console.error('claim transfer failed', e);
      failed++;
      continue;
    }
    const item = { ...(t.item || {}), id: 'gear-' + Date.now() + '-' + i + '-' + Math.floor(Math.random() * 9999) };
    state.gear.push(item);
    added++;
  }
  if (added) { saveState(); render(); }
  if (failed || skipped) {
    const parts = [];
    if (failed) parts.push(`${failed} gift${failed > 1 ? 's' : ''} couldn't be accepted right now (no connection?) and will be offered again next time.`);
    if (skipped) parts.push(`${skipped} gift${skipped > 1 ? 's were' : ' was'} already accepted on another device.`);
    showInfo('Gifts', parts.map(p => `<p>${esc(p)}</p>`).join(''));
  }
}

// Currently-editing gear id (null = adding new)
let _gearEditingId = null;

function openGearModal(editGear) {
  _gearEditingId = editGear ? editGear.id : null;
  document.getElementById('gear-modal-title').textContent = editGear ? 'Edit Item' : 'Add Item';
  document.getElementById('gear-overlay').hidden = false;
  // Reset to library tab unless editing (then jump to custom panel pre-filled)
  if (editGear) {
    document.getElementById('gear-tab-custom').click();
    fillGearFormFrom(editGear);
  } else {
    document.getElementById('gear-tab-library').click();
    populateGearLibraryGrid('');
    clearGearForm();
  }
}

function clearGearForm() {
  const fields = ['name', 'qty', 'weight', 'armor-base', 'armor-strreq', 'weapon-damage', 'weapon-properties',
                  'acbonus', 'savebonus', 'hpbonus', 'attackbonus', 'dmgbonus', 'speedbonus',
                  'str-override', 'con-override', 'int-override', 'charges-max', 'charges-used', 'notes', 'heal-dice'];
  for (const f of fields) {
    const el = document.getElementById('gear-form-' + f);
    if (el) el.value = (f === 'qty' ? '1' : (f === 'weight' ? '0' : '0'));
    if (el && (f === 'name' || f === 'weapon-damage' || f === 'weapon-properties' || f === 'notes' || f === 'heal-dice')) el.value = '';
  }
  document.getElementById('gear-form-type').value = 'misc';
  document.getElementById('gear-form-attune').checked = false;
  document.getElementById('gear-form-equipped').checked = false;
  document.getElementById('gear-form-rarity').value = 'Mundane';
  document.getElementById('gear-form-armor-stealth').checked = false;
  document.getElementById('gear-form-armor-type').value = 'medium';
  document.getElementById('gear-form-weapon-damage-type').value = 'slashing';
  document.getElementById('gear-form-weapon-ability').value = 'str';
  document.getElementById('gear-form-weapon-mastery').value = '';
  document.getElementById('gear-form-charges-recover').value = '';
  updateGearFormFieldsForType();
}

function fillGearFormFrom(g) {
  document.getElementById('gear-form-name').value = g.name || '';
  document.getElementById('gear-form-type').value = g.type || 'misc';
  document.getElementById('gear-form-qty').value = g.quantity || 1;
  document.getElementById('gear-form-weight').value = g.weight || 0;
  document.getElementById('gear-form-rarity').value = g.rarity || 'Mundane';
  document.getElementById('gear-form-attune').checked = !!g.requiresAttunement;
  document.getElementById('gear-form-equipped').checked = !!g.equipped;
  document.getElementById('gear-form-armor-base').value = g.armorBase || 0;
  document.getElementById('gear-form-armor-type').value = g.armorType || 'medium';
  document.getElementById('gear-form-armor-strreq').value = g.strReq || 0;
  document.getElementById('gear-form-armor-stealth').checked = !!g.stealthDisadv;
  document.getElementById('gear-form-weapon-damage').value = g.damage || '';
  document.getElementById('gear-form-weapon-damage-type').value = g.damageType || 'slashing';
  document.getElementById('gear-form-weapon-ability').value = g.ability || 'str';
  document.getElementById('gear-form-weapon-properties').value = g.properties || '';
  document.getElementById('gear-form-weapon-mastery').value = g.mastery || '';
  document.getElementById('gear-form-acbonus').value = g.acBonus || 0;
  document.getElementById('gear-form-savebonus').value = g.saveBonus || 0;
  document.getElementById('gear-form-hpbonus').value = g.hpBonus || 0;
  document.getElementById('gear-form-attackbonus').value = g.attackBonus || 0;
  document.getElementById('gear-form-dmgbonus').value = g.damageBonus || 0;
  document.getElementById('gear-form-speedbonus').value = g.speedBonus || 0;
  document.getElementById('gear-form-str-override').value = (g.statOverride && g.statOverride.str) || 0;
  document.getElementById('gear-form-con-override').value = (g.statOverride && g.statOverride.con) || 0;
  document.getElementById('gear-form-int-override').value = (g.statOverride && g.statOverride.int) || 0;
  document.getElementById('gear-form-charges-max').value = g.chargesMax || 0;
  document.getElementById('gear-form-charges-used').value = g.chargesUsed || 0;
  document.getElementById('gear-form-charges-recover').value = g.chargesRecover || '';
  document.getElementById('gear-form-notes').value = g.notes || '';
  document.getElementById('gear-form-heal-dice').value = g.healDice || '';
  updateGearFormFieldsForType();
}

function updateGearFormFieldsForType() {
  const t = document.getElementById('gear-form-type').value;
  document.getElementById('gear-form-armor-fields').hidden = (t !== 'armor');
  document.getElementById('gear-form-weapon-fields').hidden = (t !== 'weapon');
  document.getElementById('gear-form-consumable-fields').hidden = (t !== 'consumable');
}

function populateGearLibraryGrid(filter) {
  const grid = document.getElementById('gear-library-grid');
  if (!grid) return;
  const f = (filter || '').toLowerCase().trim();
  const items = GEAR_LIBRARY.filter(g => !f || g.name.toLowerCase().includes(f));
  grid.innerHTML = '';
  for (const lib of items) {
    const btn = document.createElement('button');
    btn.className = 'gear-library-pick';
    const metaParts = [];
    if (lib.type === 'armor' && lib.armorBase) metaParts.push(`AC ${lib.armorBase}`);
    if (lib.type === 'weapon' && lib.damage) metaParts.push(`${lib.damage} ${lib.damageType || ''}`);
    if (lib.type === 'consumable' && lib.healDice) metaParts.push(`heals ${lib.healDice}`);
    if (lib.acBonus) metaParts.push(`+${lib.acBonus} AC`);
    if (lib.saveBonus) metaParts.push(`+${lib.saveBonus} saves`);
    if (lib.attackBonus) metaParts.push(`+${lib.attackBonus} hit / +${lib.damageBonus || 0} dmg`);
    if (lib.statOverride) metaParts.push(...Object.entries(lib.statOverride).map(([k, v]) => `${k.toUpperCase()}→${v}`));
    if (lib.requiresAttunement) metaParts.push('attune');
    btn.innerHTML = `<div class="lib-name">${lib.name}</div>
      <div class="lib-meta">${lib.type}${metaParts.length ? ' · ' + metaParts.join(' · ') : ''}</div>`;
    btn.addEventListener('click', () => {
      // Pre-fill the custom form, switch to it, but DON'T save yet — let user tweak.
      const seed = { ...lib, equipped: false, attuned: false, quantity: 1, chargesUsed: 0 };
      fillGearFormFrom(seed);
      document.getElementById('gear-tab-custom').click();
    });
    grid.appendChild(btn);
  }
}

// Recover charges on rest for gear items matching the recover policy.
//   'short-rest' → recover all on Short Rest
//   'long-rest'  → recover all on Long Rest
//   'dawn'       → treated as full recovery on Long Rest (simplification of
//                  RAW "1d6+1 charges at dawn"; player can edit if needed)
function recoverGearCharges(restKind) {
  for (const g of (state.gear || [])) {
    if (!g.chargesMax) continue;
    if (restKind === 'short' && g.chargesRecover === 'short-rest') g.chargesUsed = 0;
    if (restKind === 'long' && (g.chargesRecover === 'long-rest' || g.chargesRecover === 'dawn' || g.chargesRecover === 'short-rest')) g.chargesUsed = 0;
  }
}

function saveGearForm() {
  const t = document.getElementById('gear-form-type').value;
  const item = {
    id: _gearEditingId || ('gear-' + Date.now() + '-' + Math.floor(Math.random() * 9999)),
    name: document.getElementById('gear-form-name').value.trim() || 'Unnamed',
    type: t,
    quantity: Math.max(1, parseInt(document.getElementById('gear-form-qty').value, 10) || 1),
    weight: parseFloat(document.getElementById('gear-form-weight').value) || 0,
    rarity: document.getElementById('gear-form-rarity').value,
    requiresAttunement: document.getElementById('gear-form-attune').checked,
    equipped: document.getElementById('gear-form-equipped').checked,
    attuned: false,
    notes: document.getElementById('gear-form-notes').value.trim()
  };
  if (t === 'armor') {
    item.armorBase = parseInt(document.getElementById('gear-form-armor-base').value, 10) || 0;
    item.armorType = document.getElementById('gear-form-armor-type').value;
    item.strReq = parseInt(document.getElementById('gear-form-armor-strreq').value, 10) || 0;
    item.stealthDisadv = document.getElementById('gear-form-armor-stealth').checked;
  }
  if (t === 'weapon') {
    item.damage = document.getElementById('gear-form-weapon-damage').value.trim();
    item.damageType = document.getElementById('gear-form-weapon-damage-type').value;
    item.ability = document.getElementById('gear-form-weapon-ability').value;
    item.properties = document.getElementById('gear-form-weapon-properties').value.trim();
    item.mastery = document.getElementById('gear-form-weapon-mastery').value;
  }
  if (t === 'consumable') {
    const hd = document.getElementById('gear-form-heal-dice').value.trim();
    if (hd) item.healDice = hd;
  }
  const num = (id) => parseInt(document.getElementById(id).value, 10) || 0;
  const acB = num('gear-form-acbonus'), saveB = num('gear-form-savebonus'),
        hpB = num('gear-form-hpbonus'), attB = num('gear-form-attackbonus'),
        dmgB = num('gear-form-dmgbonus'), spdB = num('gear-form-speedbonus');
  if (acB) item.acBonus = acB;
  if (saveB) item.saveBonus = saveB;
  if (hpB) item.hpBonus = hpB;
  if (attB) item.attackBonus = attB;
  if (dmgB) item.damageBonus = dmgB;
  if (spdB) item.speedBonus = spdB;
  const sO = num('gear-form-str-override'), cO = num('gear-form-con-override'), iO = num('gear-form-int-override');
  if (sO || cO || iO) {
    item.statOverride = {};
    if (sO) item.statOverride.str = sO;
    if (cO) item.statOverride.con = cO;
    if (iO) item.statOverride.int = iO;
  }
  const cMax = num('gear-form-charges-max');
  if (cMax) {
    item.chargesMax = cMax;
    item.chargesUsed = Math.max(0, Math.min(cMax, num('gear-form-charges-used')));
    item.chargesRecover = document.getElementById('gear-form-charges-recover').value;
  }
  state.gear = state.gear || [];
  if (_gearEditingId) {
    state.gear = state.gear.map(g => g.id === _gearEditingId ? { ...g, ...item } : g);
  } else {
    state.gear.push(item);
  }
  saveState();
  document.getElementById('gear-overlay').hidden = true;
  _gearEditingId = null;
  render();
}


function renderInventory() {
  for (const cat of ['armament', 'person']) {
    const ul = document.getElementById('inv-' + cat);
    if (!ul) continue;  // String-inventory cards replaced by the Gear card.
    ul.innerHTML = '';
    state.inventory[cat].forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'inv-item';
      const textarea = document.createElement('textarea');
      textarea.className = 'inv-text';
      textarea.value = item;
      textarea.rows = 1;
      textarea.addEventListener('input', (e) => {
        autoSizeTextarea(e.target);
        state.inventory[cat][idx] = e.target.value;
        saveState();
      });
      const remove = document.createElement('button');
      remove.className = 'inv-remove';
      remove.innerHTML = '×';
      remove.title = 'Remove item';
      remove.addEventListener('click', () => {
        state.inventory[cat].splice(idx, 1);
        saveState();
        renderInventory();
      });
      li.appendChild(textarea);
      li.appendChild(remove);
      ul.appendChild(li);
      autoSizeTextarea(textarea);
    });
  }
}

function autoSizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// ============================================================
// EVENT WIRING
// ============================================================

// Level Up / Level Down — replaces the old slider.
function levelUp() {
  if ((state.level || 1) >= 20) return;
  state.level = (state.level || 1) + 1;
  state.hpCurrent = null; // Reset to max on level change
  saveState();
  render();
}
function levelDown() {
  const current = state.level || 1;
  if (current <= 1) return;
  const target = current - 1;
  showConfirm('Level Down?',
    `<p>Step back to level <strong>${target}</strong>?</p>
     <div class="confirm-note">Class features, slots, and Sorcery Points unlocked at level ${current} will hide. HP recalculates. You can return any time via Level Up.</div>`,
    () => {
      state.level = target;
      state.hpCurrent = null;
      saveState();
      render();
    },
    { okLabel: 'Level Down' });
}
document.getElementById('level-up-btn').addEventListener('click', levelUp);
document.getElementById('level-down-btn').addEventListener('click', levelDown);

// Damage / Heal quick-apply buttons. Eat temp HP first on damage; cap heal at max.
function promptHpDelta(kind) {
  const isDmg = kind === 'damage';
  const title = isDmg ? 'Apply Damage' : 'Apply Heal';
  const body = `
    <p>Amount of ${isDmg ? 'damage to apply' : 'healing to apply'}:</p>
    <input id="hp-delta-input" type="number" min="0" value="" autofocus
      style="width:100%;padding:0.6rem;font-size:1.4rem;text-align:center;background:var(--ink);border:1px solid var(--gold-tarnish);color:var(--parchment);font-family:'Cinzel',serif;letter-spacing:0.08em;">
    <p style="font-style:italic;color:var(--parchment-aged);font-size:0.85rem;margin-top:0.6rem;">
      ${isDmg ? 'Temp HP absorbs first; remainder reduces current HP (floored at 0).' : 'Healing adds to current HP, capped at max.'}
    </p>
  `;
  showConfirm(title, body, () => {
    const n = parseInt(document.getElementById('hp-delta-input').value, 10);
    if (!n || n < 0) return;
    const maxHp = computeHP(state.level, computeStats(state.level));
    const cur = state.hpCurrent === null ? maxHp : state.hpCurrent;
    if (isDmg) {
      let remaining = n;
      const temp = state.tempHp || 0;
      if (temp > 0) {
        const ate = Math.min(temp, remaining);
        state.tempHp = temp - ate;
        remaining -= ate;
      }
      state.hpCurrent = Math.max(0, cur - remaining);
    } else {
      state.hpCurrent = Math.min(maxHp, cur + n);
      // Auto-reset death saves on heal above 0
      if (state.hpCurrent > 0) { state.deathSavesSuccess = 0; state.deathSavesFail = 0; }
    }
    saveState();
    render();
  }, { okLabel: isDmg ? 'Apply Damage' : 'Apply Heal' });
  // Focus the input once the modal is on screen.
  setTimeout(() => document.getElementById('hp-delta-input')?.focus(), 60);
}
document.getElementById('hp-damage-btn')?.addEventListener('click', () => promptHpDelta('damage'));
document.getElementById('hp-heal-btn')?.addEventListener('click', () => promptHpDelta('heal'));

document.getElementById('hp-current').addEventListener('input', (e) => {
  const v = parseInt(e.target.value, 10);
  state.hpCurrent = isNaN(v) ? null : v;
  // Auto-reset death saves when HP becomes > 0 (stabilized / healed)
  if (state.hpCurrent === null || state.hpCurrent > 0) {
    state.deathSavesSuccess = 0;
    state.deathSavesFail = 0;
  }
  saveState();
  // Quick visibility toggle for death saves without a full render
  const maxHp = computeHP(state.level, computeStats(state.level));
  renderDeathSaves(maxHp);
});

document.getElementById('temp-hp').addEventListener('input', (e) => {
  const v = parseInt(e.target.value, 10);
  state.tempHp = isNaN(v) || v < 0 ? 0 : v;
  saveState();
});

document.getElementById('hp-info-btn').addEventListener('click', () => {
  const level = state.level;
  const stats = computeStats(level);
  const formula = hpFormulaText(level, stats);
  const max = computeHP(level, stats);
  showInfo('Hit Point Formula',
    `<div class="spell-info-subtitle">Max HP at character level ${level}: ${max}</div>` +
    `<p style="font-family:'EB Garamond',serif; font-size:0.95rem; color:var(--parchment); line-height:1.5; margin:0;">${formula}</p>` +
    `<p style="font-family:'EB Garamond',serif; font-size:0.85rem; color:var(--parchment-aged); font-style:italic; line-height:1.5; margin-top:0.8rem;">L1 is always the max die (8). Warlock levels add avg+1 from d8 (6). Sorcerer levels add avg+1 from d6 (5). CON modifier is added once per level.</p>`
  );
});

document.getElementById('mastery-info-btn').addEventListener('click', () => {
  showInfo('Weapon Mastery Reference', weaponMasteryGlossaryHtml());
});

function weaponMasteryGlossaryHtml() {
  return Object.entries(WEAPON_MASTERIES).map(([name, text]) => `
    <p class="spell-info-para" style="margin-bottom:0.8rem;"><strong style="color:var(--gold);font-family:'Cinzel',serif;letter-spacing:0.05em;">${name}.</strong> ${text}</p>
  `).join('');
}

document.getElementById('inspiring-btn').addEventListener('click', () => {
  // Inspiring Leader: temp HP = character level + CHA mod. Temp HP doesn't
  // stack — taking the higher of current and incoming.
  const stats = computeStats(state.level);
  const incoming = state.level + mod(stats.cha);
  const newTemp = Math.max(state.tempHp || 0, incoming);
  state.tempHp = newTemp;
  document.getElementById('temp-hp').value = newTemp;
  saveState();
});

// Combat resources
document.getElementById('sorcery-points').addEventListener('input', (e) => {
  const v = parseInt(e.target.value, 10);
  state.sorceryPoints = isNaN(v) || v < 0 ? 0 : v;
  saveState();
});

document.getElementById('magical-cunning-toggle').addEventListener('click', () => {
  state.magicalCunningUsed = !state.magicalCunningUsed;
  saveState();
  renderCombatResources(state.level);
});

document.getElementById('heavenly-wings-toggle').addEventListener('click', () => {
  state.heavenlyWingsUsed = !state.heavenlyWingsUsed;
  saveState();
  renderCombatResources(state.level);
});

document.getElementById('healing-hands-toggle').addEventListener('click', () => {
  state.healingHandsUsed = !state.healingHandsUsed;
  saveState();
  renderCombatResources(state.level);
});

document.getElementById('hexblade-curse-toggle').addEventListener('click', () => {
  state.hexbladesCurseUsed = !state.hexbladesCurseUsed;
  saveState();
  renderCombatResources(state.level);
  updateVitalsBar();
});

document.getElementById('inspiration-toggle').addEventListener('click', () => {
  state.heroicInspiration = !state.heroicInspiration;
  saveState();
  renderCombatResources(state.level);
});

document.getElementById('tides-toggle').addEventListener('click', () => {
  state.tidesOfChaosUsed = !state.tidesOfChaosUsed;
  saveState();
  renderCombatResources(state.level);
});

document.getElementById('surge-roll-btn').addEventListener('click', () => {
  const roll = Math.floor(Math.random() * 100) + 1; // 1-100
  state.lastSurgeRoll = roll;
  saveState();
  renderSurge(state.level);
  // Auto-scroll the hit row into view if the table is open
  const hit = document.querySelector('#surge-table tr.hit');
  if (hit && document.querySelector('.surge-details[open]')) {
    hit.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

document.getElementById('exhaustion-level').addEventListener('input', (e) => {
  const v = parseInt(e.target.value, 10);
  state.exhaustion = isNaN(v) || v < 0 ? 0 : Math.min(6, v);
  saveState();
  render(); // exhaustion penalty changes Initiative, attacks, saves, skills
});

document.getElementById('conditions-clear').addEventListener('click', () => {
  showConfirm('Clear all conditions and exhaustion?',
    '<p>This will reset every active condition pill and set exhaustion to 0.</p>',
    () => {
      state.conditions = {};
      state.exhaustion = 0;
      saveState();
      render();
    },
    { okLabel: 'Clear All' });
});

// Spell search: filter visible rows by name. Transient, not persisted to state.
document.getElementById('spell-search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  const tbody = document.getElementById('spells-tbody');
  // First pass: show/hide spell rows based on name match. Level-header rows
  // are tracked so we can hide empty groups in a second pass.
  let currentHeader = null;
  let currentHeaderHasVisible = false;
  const rows = Array.from(tbody.children);
  for (const tr of rows) {
    if (tr.classList.contains('spell-level-header')) {
      // Finalize the previous header before moving on
      if (currentHeader) currentHeader.style.display = currentHeaderHasVisible ? '' : 'none';
      currentHeader = tr;
      currentHeaderHasVisible = false;
      tr.style.display = '';
      continue;
    }
    const nameCell = tr.querySelector('.spell-name-cell');
    const name = nameCell ? nameCell.textContent.toLowerCase() : '';
    const matches = q === '' || name.includes(q);
    tr.style.display = matches ? '' : 'none';
    if (matches) currentHeaderHasVisible = true;
  }
  // Finalize the last header
  if (currentHeader) currentHeader.style.display = currentHeaderHasVisible ? '' : 'none';
});

document.getElementById('concentration-select').addEventListener('change', (e) => {
  state.concentratingOn = e.target.value || null;
  saveState();
  updateVitalsBar();
});

// Rest buttons
document.getElementById('short-rest-btn').addEventListener('click', () => {
  const { w } = classBreakdown(state.level);
  const items = [];
  if (w >= 1) items.push('Refill all Pact Magic slots');
  items.push("Refresh Hexblade's Curse (1/short or long rest)");
  items.push("Spend Hit Dice manually after — a short rest doesn't auto-heal");
  const body = `
    <p>This will:</p>
    <ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
    <div class="confirm-note">Magical Cunning, Innate Sorcery, Sorcery Points, and Tides of Chaos refresh only on a long rest.</div>
  `;
  showConfirm('Take a Short Rest?', body, () => {
    recoverGearCharges('short');
    state.usedSlots.warlock = 0;
    state.hexbladesCurseUsed = false;
    saveState();
    render();
  }, { okLabel: 'Short Rest' });
});

document.getElementById('long-rest-btn').addEventListener('click', () => {
  const { w, s } = classBreakdown(state.level);
  const items = ['Restore HP to max and clear Temp HP'];
  const hdRecover = Math.max(1, Math.floor(state.level / 2));
  items.push(`Refund up to ${hdRecover} Hit Dice (half character level, min 1)`);
  if (w >= 1) items.push('Refill all Pact Magic slots');
  if (s >= 1) items.push('Refill all Sorcerer spell slots');
  if (s >= 2) items.push(`Refill Sorcery Points to ${s}`);
  if (s >= 1) items.push('Refill Innate Sorcery uses');
  if (w >= 2) items.push('Refresh Magical Cunning');
  if (w >= 1) items.push("Refresh Hexblade's Curse");
  // Heavenly Wings is gated on the Aasimar feat pick — show generically.
  items.push("Refresh Heavenly Wings (Aasimar transformation)");
  items.push('Refresh Healing Hands (Aasimar)');
  if (s >= 3) items.push('Refresh Tides of Chaos');
  const luckyTakenForRest = state.level >= 16 && (state.alternates['lvl16-feat'] || 'warcaster16') === 'lucky';
  if (luckyTakenForRest) items.push('Refill Luck Points to 3 (Lucky feat)');
  items.push('Reset death saves');
  const body = `
    <p>This will:</p>
    <ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
    <div class="confirm-note">Conditions, exhaustion, and concentration are <strong>not</strong> auto-cleared.</div>
  `;
  showConfirm('Take a Long Rest?', body, () => {
    state.hpCurrent = null;
    state.tempHp = 0;
    recoverGearCharges('long');
    state.usedSlots = { warlock: 0, sorc1: 0, sorc2: 0, sorc3: 0, sorc4: 0, sorc5: 0, sorc6: 0, sorc7: 0, sorc8: 0 };
    state.sorceryPoints = classBreakdown(state.level).s;
    state.innateSorceryUsed = 0;
    state.magicalCunningUsed = false;
    state.heavenlyWingsUsed = false;
    state.healingHandsUsed = false;
    state.hexbladesCurseUsed = false;
    state.tidesOfChaosUsed = false;
    state.luckPointsUsed = 0;
    state.deathSavesSuccess = 0;
    state.deathSavesFail = 0;
    // Hit Dice: regain up to half character level (min 1) total. Refill
    // Warlock d8s first (better die), then Sorcerer d6s with the remainder.
    let regain = Math.max(1, Math.floor(state.level / 2));
    const wUsed = state.hitDiceWarlockUsed || 0;
    const wRefill = Math.min(wUsed, regain);
    state.hitDiceWarlockUsed = wUsed - wRefill;
    regain -= wRefill;
    if (regain > 0) {
      const sUsed = state.hitDiceSorcererUsed || 0;
      state.hitDiceSorcererUsed = Math.max(0, sUsed - regain);
    }
    saveState();
    render();
  }, { okLabel: 'Long Rest' });
});

function updateCoinTotal() {
  const c = state.coins || {};
  const total = (c.pp || 0) * 10 + (c.gp || 0) + (c.sp || 0) / 10 + (c.cp || 0) / 100;
  const el = document.getElementById('coin-total');
  if (el) el.textContent = total > 0 ? `≈ ${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} gp total` : '';
}

// --- Coin: readout + Add/Spend transaction engine (auto-change on spend) ---
function renderCoins() {
  const c = state.coins || {};
  ['cp', 'sp', 'gp', 'pp'].forEach(d => {
    const el = document.getElementById('coin-val-' + d);
    if (el) el.textContent = (c[d] || 0).toLocaleString();
  });
  updateCoinTotal();
  renderCoinLog();
}
function coinsTotalCp(c) { return (c.pp || 0) * 1000 + (c.gp || 0) * 100 + (c.sp || 0) * 10 + (c.cp || 0); }
function fmtCoinDelta(by) { return ['pp', 'gp', 'sp', 'cp'].filter(d => by[d]).map(d => by[d] + ' ' + d).join(', ') || '0'; }
function cleanDelta(by) { const d = {}; ['pp', 'gp', 'sp', 'cp'].forEach(k => { if (by[k]) d[k] = by[k]; }); return d; }
function readTxInputs() {
  const get = id => { const el = document.getElementById(id); const v = parseInt(el && el.value, 10); return (isNaN(v) || v < 0) ? 0 : v; };
  return { cp: get('tx-cp'), sp: get('tx-sp'), gp: get('tx-gp'), pp: get('tx-pp') };
}
function readTxNote() { const el = document.getElementById('tx-note'); return el ? el.value.trim() : ''; }
function clearTxInputs() { ['tx-cp', 'tx-sp', 'tx-gp', 'tx-pp', 'tx-note'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); }
function coinTxMsg(text, isErr) {
  const el = document.getElementById('coin-tx-msg'); if (!el) return;
  el.textContent = text || ''; el.classList.toggle('error', !!isErr);
  clearTimeout(coinTxMsg._t);
  if (text) coinTxMsg._t = setTimeout(() => { el.textContent = ''; el.classList.remove('error'); }, 2800);
}
function applyAdd(by) {
  const c = Object.assign({ pp: 0, gp: 0, sp: 0, cp: 0 }, state.coins || {});
  ['pp', 'gp', 'sp', 'cp'].forEach(d => { if (by[d]) c[d] = (c[d] || 0) + by[d]; });
  state.coins = c;
}
function applySpend(by) {
  const c = Object.assign({ pp: 0, gp: 0, sp: 0, cp: 0 }, state.coins || {});
  const spendCp = coinsTotalCp(by);
  if (spendCp > coinsTotalCp(c)) return false;
  const lowerCp = (c.gp || 0) * 100 + (c.sp || 0) * 10 + (c.cp || 0);
  let pp = c.pp || 0, pool;
  if (lowerCp >= spendCp) { pool = lowerCp - spendCp; }
  else { const b = Math.ceil((spendCp - lowerCp) / 1000); pp -= b; pool = lowerCp + b * 1000 - spendCp; }
  const gp = Math.floor(pool / 100); pool %= 100;
  const sp = Math.floor(pool / 10); const cp = pool % 10;
  state.coins = { pp, gp, sp, cp };
  return true;
}
function logCoinTx(kind, by, note) {
  state.coinLog = state.coinLog || [];
  state.coinLog.unshift({ id: logUid(), ts: Date.now(), kind, delta: cleanDelta(by), note: note || '' });
}
function addCoins(by, note) {
  if (!['pp', 'gp', 'sp', 'cp'].some(d => by[d])) { coinTxMsg('Enter an amount to add.', true); return; }
  applyAdd(by); logCoinTx('add', by, note);
  renderCoins(); saveState();
  coinTxMsg('Added ' + fmtCoinDelta(by) + (note ? ' · ' + note : '') + '.'); clearTxInputs();
}
function spendCoins(by, note) {
  const spendCp = coinsTotalCp(by);
  if (spendCp <= 0) { coinTxMsg('Enter an amount to spend.', true); return; }
  if (spendCp > coinsTotalCp(state.coins || {})) {
    coinTxMsg('Not enough coin — you hold ≈ ' + (coinsTotalCp(state.coins || {}) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' gp.', true); return;
  }
  applySpend(by); logCoinTx('spend', by, note);
  renderCoins(); saveState();
  coinTxMsg('Spent ' + fmtCoinDelta(by) + (note ? ' · ' + note : '') + '.'); clearTxInputs();
}
function undoCoinTx(id) {
  const log = state.coinLog || [];
  const tx = log.find(x => x.id === id); if (!tx) return;
  if (tx.kind === 'add') {
    if (coinsTotalCp(tx.delta) > coinsTotalCp(state.coins || {})) { coinTxMsg("Can't undo — those coins are already spent.", true); return; }
    applySpend(tx.delta);
  } else {
    applyAdd(tx.delta);
  }
  state.coinLog = log.filter(x => x.id !== id);
  renderCoins(); saveState();
  coinTxMsg('Undid ' + (tx.kind === 'add' ? '+ ' : '− ') + fmtCoinDelta(tx.delta) + '.');
}
function renderCoinLog() {
  const listEl = document.getElementById('coin-log-list'); if (!listEl) return;
  const log = state.coinLog || [];
  const countEl = document.getElementById('coin-history-count');
  if (countEl) countEl.textContent = log.length ? '(' + log.length + ')' : '';
  if (!log.length) { listEl.innerHTML = '<div class="coin-log-empty">No transactions yet.</div>'; return; }
  listEl.innerHTML = log.map(tx => {
    const sign = tx.kind === 'add' ? '+ ' : '− ';
    const dt = new Date(tx.ts);
    const date = fmtLogDate(tx.ts) + ' · ' + dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return '<div class="coin-log-row">' +
      '<span class="coin-log-amt ' + esc(tx.kind) + '">' + sign + logEsc(fmtCoinDelta(tx.delta)) + '</span>' +
      '<span class="coin-log-note' + (tx.note ? '' : ' empty') + '">' + (tx.note ? logEsc(tx.note) : '—') + '</span>' +
      '<span class="coin-log-date">' + date + '</span>' +
      '<span class="coin-log-actions">' +
      '<button type="button" class="coin-log-undo" data-undo="' + esc(tx.id) + '">Undo</button>' +
      '<button type="button" class="coin-log-del" data-del="' + esc(tx.id) + '" title="Remove this record (keeps balance)">✕</button>' +
      '</span></div>';
  }).join('');
  listEl.querySelectorAll('.coin-log-undo').forEach(b => b.addEventListener('click', () => undoCoinTx(b.dataset.undo)));
  listEl.querySelectorAll('.coin-log-del').forEach(b => b.addEventListener('click', () => {
    state.coinLog = (state.coinLog || []).filter(x => x.id !== b.dataset.del);
    renderCoinLog(); saveState();
  }));
}
(function wireCoins() {
  const addB = document.getElementById('coin-add-btn');
  const spB = document.getElementById('coin-spend-btn');
  if (addB) addB.addEventListener('click', () => addCoins(readTxInputs(), readTxNote()));
  if (spB) spB.addEventListener('click', () => spendCoins(readTxInputs(), readTxNote()));
  ['tx-cp', 'tx-sp', 'tx-gp', 'tx-pp', 'tx-note'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') addCoins(readTxInputs(), readTxNote()); });
  });
})();

document.querySelectorAll('[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.getAttribute('data-add');
    state.inventory[cat].push('');
    saveState();
    renderInventory();
    // Focus the new field
    const ul = document.getElementById('inv-' + cat);
    const lastInput = ul.querySelector('li:last-child textarea');
    if (lastInput) lastInput.focus();
  });
});

// Buttons inside <summary> elements shouldn't toggle their parent <details>
document.addEventListener('click', (e) => {
  if (e.target.closest('summary') && e.target.closest('button')) {
    e.preventDefault();
  }
});

// Click any .has-tip element to open its title in the styled info modal.
// (Hover tooltips are still available via the native title attribute.)
document.addEventListener('click', (e) => {
  const tip = e.target.closest('.has-tip[title]');
  if (!tip) return;
  // Strip nested meta spans (e.g. "(d8 · Warlock)") from the label so the
  // modal title stays clean; the body uses the full title text.
  const labelClone = tip.cloneNode(true);
  labelClone.querySelectorAll('.resource-meta').forEach(el => el.remove());
  const label = labelClone.textContent.trim().replace(/\s+/g, ' ');
  const body = tip.title.replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]));
  showInfo(label, `<p style="font-family:'EB Garamond',serif; font-size:0.95rem; color:var(--parchment); line-height:1.55; margin:0;">${body}</p>`);
  e.preventDefault();
});

// Options dropdown (Export / Import / Reset)
document.getElementById('options-toggle').addEventListener('click', (e) => {
  e.stopPropagation();
  const dd = document.getElementById('options-dropdown');
  dd.hidden = !dd.hidden;
  if (!dd.hidden) {
    setTimeout(() => document.addEventListener('click', closeOptionsOnOutside), 0);
  } else {
    document.removeEventListener('click', closeOptionsOnOutside);
  }
});

function closeOptionsOnOutside(e) {
  const dd = document.getElementById('options-dropdown');
  const toggle = document.getElementById('options-toggle');
  if (dd.contains(e.target) || e.target === toggle) return;
  dd.hidden = true;
  document.removeEventListener('click', closeOptionsOnOutside);
}

// Any button click inside the dropdown should close it (file input excluded —
// it's the hidden picker behind the Import button, fired via .click()).
document.getElementById('options-dropdown').addEventListener('click', (e) => {
  if (e.target.closest('button')) {
    document.getElementById('options-dropdown').hidden = true;
    document.removeEventListener('click', closeOptionsOnOutside);
  }
});

function doExport() {
  const payload = { ...state, _exportedAt: new Date().toISOString(), _app: STORAGE_KEY };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `caelen-ravenshade-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById('export-btn').addEventListener('click', doExport);
document.getElementById('banner-export-btn').addEventListener('click', doExport);

document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = ''; // allow re-selecting the same file later
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try { parsed = JSON.parse(reader.result); }
    catch (err) { showInfo('Import failed', '<p>Could not parse that file as JSON.</p>'); return; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      showInfo('Import failed', '<p>That file does not look like a character sheet backup.</p>');
      return;
    }
    const applyImport = () => {
      const { _exportedAt, _app, ...incoming } = parsed;
      state = { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...incoming };
      state.updatedAt = new Date().toISOString();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) { console.error('Save failed', err); }
      (() => { const _s = document.getElementById('level-slider'); if (_s) _s.value = state.level; })();
      render();
      showSaveIndicator();
      syncToCloud();
    };
    const schemaOk = !(parsed.schemaVersion && parsed.schemaVersion > DEFAULT_STATE.schemaVersion);
    const doImport = () => showConfirm(
      'Import this backup?',
      '<p>This will <strong>overwrite the current sheet</strong> with the imported data. Your current state will be replaced.</p>',
      applyImport,
      { okLabel: 'Import' }
    );
    if (!schemaOk) {
      showConfirm(
        'Schema mismatch',
        `<p>This backup is schema v${parsed.schemaVersion} but this sheet only knows v${DEFAULT_STATE.schemaVersion}.</p><div class="confirm-note">Import anyway? Some fields may not load correctly.</div>`,
        doImport,
        { okLabel: 'Import anyway' }
      );
    } else {
      doImport();
    }
  };
  reader.onerror = () => showInfo('Read error', '<p>Could not read that file.</p>');
  reader.readAsText(file);
});

document.getElementById('reset-btn').addEventListener('click', () => {
  showConfirm(
    'Reset Sheet?',
    `<p>This will erase the entire sheet and return everything to defaults:</p>
     <ul><li>All your edits, level, and choices</li><li>Inventory and notes</li><li>Combat resources and concentration</li></ul>
     <div class="confirm-note">This cannot be undone.</div>`,
    () => {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      state.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      (() => { const _s = document.getElementById('level-slider'); if (_s) _s.value = state.level; })();
      render();
      syncToCloud();
    },
    { okLabel: 'Reset' }
  );
});

// Sync slider to loaded level
(() => { const _s = document.getElementById('level-slider'); if (_s) _s.value = state.level; })();

// Gear modal wiring
document.getElementById('gear-add-btn').addEventListener('click', () => openGearModal(null));
document.getElementById('gear-transfer-btn').addEventListener('click', () => openTransferModal());
document.getElementById('transfer-close').addEventListener('click', () => closeTransferModal());
document.getElementById('transfer-cancel').addEventListener('click', () => closeTransferModal());
document.getElementById('transfer-send').addEventListener('click', () => sendTransferSelections());
document.getElementById('gear-close').addEventListener('click', () => { document.getElementById('gear-overlay').hidden = true; _gearEditingId = null; });
document.getElementById('gear-form-cancel').addEventListener('click', () => { document.getElementById('gear-overlay').hidden = true; _gearEditingId = null; });
document.getElementById('gear-form-save').addEventListener('click', saveGearForm);
document.getElementById('gear-form-type').addEventListener('change', updateGearFormFieldsForType);
document.getElementById('gear-tab-library').addEventListener('click', () => {
  document.getElementById('gear-tab-library').classList.add('active');
  document.getElementById('gear-tab-custom').classList.remove('active');
  document.getElementById('gear-tab-library-panel').hidden = false;
  document.getElementById('gear-tab-custom-panel').hidden = true;
});
document.getElementById('gear-tab-custom').addEventListener('click', () => {
  document.getElementById('gear-tab-custom').classList.add('active');
  document.getElementById('gear-tab-library').classList.remove('active');
  document.getElementById('gear-tab-custom-panel').hidden = false;
  document.getElementById('gear-tab-library-panel').hidden = true;
});
document.getElementById('gear-library-search').addEventListener('input', (e) => populateGearLibraryGrid(e.target.value));
// Gear search input — filters the visible gear rows by name / type / notes.
{
  const _gs = document.getElementById('gear-search');
  if (_gs) _gs.addEventListener('input', () => renderGear());
  const _gsc = document.getElementById('gear-search-clear');
  if (_gsc) _gsc.addEventListener('click', () => { _gs.value = ''; renderGear(); _gs.focus(); });
}

// Spell search input wiring (Caelen has no level-up button, so anchor here)
{
  const _ss = document.getElementById('spell-search');
  if (_ss) _ss.addEventListener('input', () => render());
  const _ssc = document.getElementById('spell-search-clear');
  if (_ssc) _ssc.addEventListener('click', () => { _ss.value = ''; render(); _ss.focus(); });
}


// ============================================================
// INITIAL CLOUD LOAD
// ============================================================
// localStorage is the fast cache. After the initial render from local,
// reach out for remote state; if it's newer, replace and re-render.
async function initCloudSync() {
  const hasLocal = !!localStorage.getItem(STORAGE_KEY);
  setCloudStatus('loading', 'Cloud: loading…');
  try {
    const remote = await fetchRemote();
    const hasRemoteData = remote && remote.data && Object.keys(remote.data).length > 0;
    if (hasRemoteData) {
      const remoteTime = new Date(remote.updated_at).getTime();
      const localTime = state.updatedAt ? new Date(state.updatedAt).getTime() : 0;
      if (remoteTime > localTime) {
        state = { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...remote.data };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
        (() => { const _s = document.getElementById('level-slider'); if (_s) _s.value = state.level; })();
        render();
        setLoadedFrom('cloud');
      } else {
        setLoadedFrom('local-newer');
        // Local is ahead of cloud — push so they reconverge.
        syncToCloud();
      }
    } else {
      setLoadedFrom(hasLocal ? 'local' : 'defaults');
      // Cloud row is empty; if we have local state, seed the cloud.
      if (hasLocal) syncToCloud();
    }
    setCloudStatus('synced', 'Cloud: synced');
  } catch (e) {
    console.error('cloud load failed', e);
    setLoadedFrom(hasLocal ? 'local' : 'defaults');
    setCloudStatus('error', 'Cloud: offline');
  }

  // Check for gifts from other party members, once per load. Kept as its own
  // try/catch (separate from the state-sync try above) so a failure here
  // doesn't flip the cloud status indicator to "offline" — it's a secondary
  // check, not the primary sync. Skipped in DM view: the DM shouldn't be
  // claiming gifts on Caelen's behalf.
  if (!IS_DM) {
    try {
      const pending = await fetchPendingTransfers();
      if (pending && pending.length) showTransferInbox(pending);
    } catch (e) {
      console.error('transfer inbox check failed', e);
    }
  }
}

// ============================================================
// DM POLLING
// ============================================================
// In DM view, poll the cloud every 5s so HP and slot changes show up
// during combat. Skipped when the tab is hidden to save bandwidth.
if (IS_DM) {
  setInterval(async () => {
    if (document.visibilityState === 'hidden') return;
    try {
      const remote = await fetchRemote();
      if (!remote || !remote.data || Object.keys(remote.data).length === 0) return;
      const remoteTime = new Date(remote.updated_at).getTime();
      const localTime = state.updatedAt ? new Date(state.updatedAt).getTime() : 0;
      if (remoteTime > localTime) {
        state = { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...remote.data };
        (() => { const _s = document.getElementById('level-slider'); if (_s) _s.value = state.level; })();
        render();
        setCloudStatus('synced', 'Cloud: live');
      }
    } catch (e) {
      console.error('dm poll failed', e);
      setCloudStatus('error', 'Cloud: offline');
    }
  }, 5000);
}

// ============================================================
// HEARTBEAT — keep Supabase project alive
// ============================================================
// Free-tier projects pause after 7 days of inactivity. A lightweight read
// every 20 minutes while the page is visible prevents that.
if (!IS_DM) {
  setInterval(async () => {
    if (document.visibilityState === 'hidden') return;
    try { await fetchRemote(); } catch (e) {}
  }, 20 * 60 * 1000);
}

window.addEventListener('pagehide', () => {
  if (IS_DM) return;
  clearTimeout(saveTimer);
  clearTimeout(cloudTimer);
  if (!state || Object.keys(state).length === 0) return;
  state.updatedAt = new Date().toISOString();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  try { localStorage.setItem(STORAGE_KEY_BAK, JSON.stringify(state)); } catch (e) {}
  const body = JSON.stringify({ id: ROW_ID, data: state, schema_version: state.schemaVersion || 1 });
  fetch(SB_REST, {
    method: 'POST',
    headers: { ...SB_AUTH, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body,
    keepalive: true,
  }).catch(() => {});
});


// Collapsible feature/feat rows: click a name (h4) to toggle its description.
// Delegated so it covers both static and dynamically-rendered blocks.
document.addEventListener('click', (e) => {
  const h4 = e.target.closest('h4');
  if (!h4) return;
  const block = h4.parentElement;
  if (block && (block.classList.contains('feature-block') || block.classList.contains('feat-block'))) {
    block.classList.toggle('open');
  }
});

// Persisted section collapse state — remembers which top-level sections were
// open/closed across reloads, so a section you're not using this session
// (e.g. Spells when nothing's prepared) doesn't re-expand and add scroll
// length every load. Uses the same slug-id scheme quick-nav's idFor() below
// falls back to (it only assigns an id `if (!el.id)`, so ids set here win).
(function initSectionPersistence() {
  function slugFor(el, label) {
    if (!el.id) el.id = 'sec-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return el.id;
  }
  document.querySelectorAll('details.section').forEach((sec) => {
    const titleEl = sec.querySelector('.section-title');
    if (!titleEl) return;
    const id = slugFor(sec, titleEl.textContent.trim());
    if (Object.prototype.hasOwnProperty.call(state.sectionOpen, id)) {
      sec.open = state.sectionOpen[id];
    }
    sec.addEventListener('toggle', () => {
      state.sectionOpen[id] = sec.open;
      saveState();
    });
  });
})();

// Sticky vitals bar — fades in once the ability-scores/defense row scrolls
// out of view, so HP/AC/Concentration/Curse stay checkable without
// scrolling back to the top. Mirrors DOM values already kept current by
// render()/updateVitalsBar() rather than tracking its own state.
(function initVitalsBar() {
  const bar = document.getElementById('vitals-bar');
  if (!bar) return;
  const sentinel = document.querySelector('.defense-row');
  if (sentinel && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      bar.classList.toggle('visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
    }, { threshold: 0 });
    io.observe(sentinel);
  }
  document.getElementById('vb-hp-damage-btn')?.addEventListener('click', () => promptHpDelta('damage'));
  document.getElementById('vb-hp-heal-btn')?.addEventListener('click', () => promptHpDelta('heal'));
  document.getElementById('vb-nav-btn')?.addEventListener('click', () => {
    document.getElementById('quick-nav-toggle')?.click();
  });
})();

// Floating quick-nav: build links from sections + their visible subsections; smooth-scroll + open on click
(function buildQuickNav() {
  const nav = document.getElementById('quick-nav');
  const list = document.getElementById('quick-nav-list');
  const toggle = document.getElementById('quick-nav-toggle');
  if (!nav || !list || !toggle) return;
  let counter = 0;
  function idFor(el, label) {
    if (!el.id) el.id = 'nav-' + (++counter) + '-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return el.id;
  }
  function addLink(target, label, isSub) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + target.id;
    a.textContent = label;
    if (isSub) a.className = 'quick-nav-sub';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      let p = target;
      while (p) { if (p.tagName === 'DETAILS') p.open = true; p = p.parentElement ? p.parentElement.closest('details') : null; }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      hideNav();
    });
    li.appendChild(a);
    list.appendChild(li);
  }
  function rebuild() {
    list.innerHTML = '';
    document.querySelectorAll('details.section, .section-bar').forEach((sec) => {
      const titleEl = sec.querySelector('.section-title');
      if (!titleEl) return;
      const label = titleEl.textContent.trim();
      idFor(sec, label);
      addLink(sec, label, false);
      sec.querySelectorAll('.collapsible-card').forEach((card) => {
        if (card.hidden) return;
        const h = card.querySelector(':scope > summary h3');
        if (!h) return;
        const hc = h.cloneNode(true);
        hc.querySelectorAll('button').forEach((b) => b.remove());
        const subLabel = hc.textContent.trim().replace(/\s+/g, ' ');
        if (!subLabel) return;
        idFor(card, subLabel);
        addLink(card, subLabel, true);
      });
    });
  }
  function hideNav() { list.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', () => {
    const show = list.hidden;
    if (show) rebuild();
    list.hidden = !show;
    toggle.setAttribute('aria-expanded', String(show));
  });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) hideNav(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideNav(); });
})();

// ============================================================
// FIELD LOG — structured, searchable, tagged session journal
// ============================================================
function logEsc(s) { return esc(s); }
function logUid() {
  return 'log-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
}
function migrateLog() {
  if (!Array.isArray(state.logEntries)) {
    state.logEntries = [];
    if (state.notes && state.notes.trim()) {
      const now = Date.now();
      state.logEntries.push({ id: logUid(), title: 'Imported notes', body: state.notes, tags: [], createdAt: now, updatedAt: now });
    }
  }
}
function allLogTags() {
  const s = new Set();
  (state.logEntries || []).forEach(e => (e.tags || []).forEach(t => s.add(t)));
  return Array.from(s).sort();
}
function fmtLogDate(ts) {
  try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  catch (e) { return ''; }
}
function setLogStatus(kind) {
  const el = document.getElementById('log-save-status');
  if (!el) return;
  if (kind === 'saving') { el.textContent = 'Saving…'; el.className = 'log-save-status saving'; }
  else {
    const t = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    el.textContent = 'Saved ✓ ' + t;
    el.className = 'log-save-status saved';
  }
}
function logSave() {
  setLogStatus('saving');
  saveState();
  clearTimeout(logSave._t);
  logSave._t = setTimeout(() => setLogStatus('saved'), 500);
}
function renderLog() {
  const listEl = document.getElementById('log-list');
  if (!listEl) return;
  if (!renderLog.state) renderLog.state = { search: '', tag: null, open: new Set(), editing: new Set() };
  const S = renderLog.state;

  const filterEl = document.getElementById('log-tag-filter');
  if (filterEl) {
    filterEl.innerHTML = allLogTags().map(t =>
      `<button type="button" class="log-tag-chip${S.tag === t ? ' active' : ''}" data-tag="${logEsc(t)}">#${logEsc(t)}</button>`).join('');
  }

  const q = (S.search || '').trim().toLowerCase();
  let entries = (state.logEntries || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (S.tag) entries = entries.filter(e => (e.tags || []).includes(S.tag));
  if (q) entries = entries.filter(e =>
    (e.title || '').toLowerCase().includes(q) ||
    (e.body || '').toLowerCase().includes(q) ||
    (e.tags || []).join(' ').toLowerCase().includes(q));

  if (entries.length === 0) {
    const any = (state.logEntries || []).length;
    listEl.innerHTML = `<p class="log-empty">${any ? 'No entries match your search/filter.' : 'No entries yet. Click + New Entry to start your log.'}</p>`;
    return;
  }

  listEl.innerHTML = entries.map(e => {
    const open = S.open.has(e.id) ? ' open' : '';
    const editing = S.editing.has(e.id) ? ' editing' : '';
    const tagsHtml = (e.tags || []).map(t => `<span class="log-chip">#${logEsc(t)}</span>`).join('');
    const bodyText = e.body ? logEsc(e.body) : '';
    return `<details class="log-entry${editing}" data-id="${logEsc(e.id)}"${open}>
      <summary>
        <span class="log-entry-title">${e.title ? logEsc(e.title) : '<em>untitled</em>'}</span>
        <span class="log-entry-tags">${tagsHtml}</span>
        <span class="log-entry-date">${fmtLogDate(e.createdAt)}</span>
      </summary>
      <div class="log-entry-body">
        <div class="log-read">
          <div class="log-read-text${bodyText ? '' : ' empty'}">${bodyText || LOG_EMPTY_BODY}</div>
          <div class="log-entry-actions">
            <span class="log-entry-meta">edited ${e.updatedAt ? fmtLogDate(e.updatedAt) : '—'}</span>
            <span class="log-entry-btns">
              <button type="button" class="log-btn log-edit-btn">Edit</button>
              <button type="button" class="log-delete-btn" data-del="${logEsc(e.id)}">Delete</button>
            </span>
          </div>
        </div>
        <div class="log-edit">
          <input class="log-title-input" type="text" value="${logEsc(e.title)}" placeholder="Title — e.g. Session 12 · the warren">
          <textarea class="log-body-input" rows="6" placeholder="What happened, who you met, what you learned…">${logEsc(e.body)}</textarea>
          <input class="log-tags-input" type="text" value="${logEsc((e.tags || []).join(', '))}" placeholder="tags, comma-separated — npc, quest, loot">
          <div class="log-entry-actions">
            <span class="log-entry-meta">edited ${e.updatedAt ? fmtLogDate(e.updatedAt) : '—'}</span>
            <span class="log-entry-btns">
              <button type="button" class="log-btn log-save-btn">Save &amp; Close</button>
              <button type="button" class="log-delete-btn" data-del="${logEsc(e.id)}">Delete</button>
            </span>
          </div>
        </div>
      </div>
    </details>`;
  }).join('');

  listEl.querySelectorAll('.log-entry').forEach(det => {
    const id = det.dataset.id;
    const entry = () => (state.logEntries || []).find(x => x.id === id);
    det.addEventListener('toggle', () => {
      if (det.open) { S.open.add(id); }
      else { S.open.delete(id); S.editing.delete(id); det.classList.remove('editing'); }
    });
    const titleI = det.querySelector('.log-title-input');
    const bodyI = det.querySelector('.log-body-input');
    const tagsI = det.querySelector('.log-tags-input');
    const readText = det.querySelector('.log-read-text');
    titleI.addEventListener('input', () => { const e = entry(); if (!e) return; e.title = titleI.value; e.updatedAt = Date.now(); det.querySelector('.log-entry-title').innerHTML = e.title ? logEsc(e.title) : '<em>untitled</em>'; logSave(); });
    bodyI.addEventListener('input', () => { const e = entry(); if (!e) return; e.body = bodyI.value; e.updatedAt = Date.now(); readText.classList.toggle('empty', !e.body); readText.textContent = e.body || LOG_EMPTY_BODY; logSave(); });
    tagsI.addEventListener('input', () => { const e = entry(); if (!e) return; e.tags = tagsI.value.split(',').map(s => s.trim()).filter(Boolean); e.updatedAt = Date.now(); det.querySelector('.log-entry-tags').innerHTML = e.tags.map(t => `<span class="log-chip">#${logEsc(t)}</span>`).join(''); logSave(); });
    bodyI.addEventListener('blur', () => setLogStatus('saved'));
    det.querySelector('.log-edit-btn').addEventListener('click', () => {
      S.editing.add(id);
      det.classList.add('editing');
      if (titleI) titleI.focus();
    });
    det.querySelector('.log-save-btn').addEventListener('click', () => {
      saveState();
      setLogStatus('saved');
      S.editing.delete(id);
      S.open.delete(id);
      renderLog();
    });
    det.querySelectorAll('.log-delete-btn').forEach(btn => btn.addEventListener('click', () => {
      const e = entry(); if (!e) return;
      showConfirm('Delete this log entry?', `<p>"${e.title ? logEsc(e.title) : 'untitled'}" will be removed. This can't be undone.</p>`, () => {
        state.logEntries = (state.logEntries || []).filter(x => x.id !== id);
        S.open.delete(id); S.editing.delete(id);
        logSave();
        renderLog();
      }, { okLabel: 'Delete' });
    }));
  });
}
// Toolbar wiring (static elements; attach once)
(function wireFieldLog() {
  renderLog.state = renderLog.state || { search: '', tag: null, open: new Set(), editing: new Set() };
  const addBtn = document.getElementById('log-add-btn');
  const searchI = document.getElementById('log-search');
  const filterEl = document.getElementById('log-tag-filter');
  const exportBtn = document.getElementById('log-export-btn');
  if (!addBtn) return;
  addBtn.addEventListener('click', () => {
    const now = Date.now();
    const e = { id: logUid(), title: '', body: '', tags: [], createdAt: now, updatedAt: now };
    state.logEntries = state.logEntries || [];
    state.logEntries.unshift(e);
    renderLog.state.open.add(e.id);
    renderLog.state.editing.add(e.id);
    renderLog.state.search = '';
    renderLog.state.tag = null;
    if (searchI) searchI.value = '';
    logSave();
    renderLog();
    const det = document.querySelector(`.log-entry[data-id="${CSS.escape(e.id)}"]`);
    if (det) { det.scrollIntoView({ behavior: 'smooth', block: 'center' }); const t = det.querySelector('.log-title-input'); if (t) t.focus(); }
  });
  if (searchI) searchI.addEventListener('input', e => { renderLog.state.search = e.target.value; renderLog(); });
  if (filterEl) filterEl.addEventListener('click', e => {
    const b = e.target.closest('.log-tag-chip'); if (!b) return;
    renderLog.state.tag = renderLog.state.tag === b.dataset.tag ? null : b.dataset.tag;
    renderLog();
  });
  if (exportBtn) exportBtn.addEventListener('click', async () => {
    const md = (state.logEntries || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(e => {
      const tags = (e.tags || []).map(t => '#' + t).join(' ');
      return '## ' + (e.title || 'Untitled') + '  (' + fmtLogDate(e.createdAt) + ')' + (tags ? '\n' + tags : '') + '\n\n' + (e.body || '');
    }).join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(md);
      exportBtn.textContent = 'Copied!';
      setTimeout(() => { exportBtn.textContent = 'Copy all'; }, 1200);
    } catch (err) {
      showInfo('Field Log (Markdown)', `<textarea style="width:100%;height:320px;font-family:monospace;font-size:0.8rem;">${logEsc(md)}</textarea>`);
    }
  });
})();

// ============================================================
// BOOT — keep this the last thing in the file
// ============================================================
// Everything above only declares functions/constants or wires listeners.
// The first render and the cloud load run here, after every top-level
// `const`/`let` has been initialized, so nothing render() touches can be in
// its temporal dead zone (the cause of two past "sheet goes blank" bugs).
(function boot() {
  try { migrateLegacyMagicItemsToGear(); } catch (e) { console.error('migrateLegacyMagicItemsToGear failed:', e); }
  safeRender('render', render);
  initCloudSync();
})();
