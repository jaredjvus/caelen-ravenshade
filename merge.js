// Three-way merge for character sheet state.
//
// Used when this device and another device (or another tab) both changed
// the sheet since they last agreed. `base` is the version both started from
// (the last version this device saw in the cloud), `local` is this device's
// copy, `remote` is the cloud's current copy. Rules, per field:
//
//   - changed on one side only        -> take that side
//   - changed the same way on both    -> take it
//   - lists of objects with ids (log entries, gear, coin log, ...)
//                                     -> merged entry by entry: additions
//                                        from both sides are kept, a deletion
//                                        on one side wins unless the other side
//                                        edited that entry, and an entry edited
//                                        on both sides is merged field by field
//   - nested plain objects            -> merged recursively
//   - anything else changed on both   -> this device's value wins
//
// With no base (first sync from an older version of the page), lists are
// unioned and plain values follow `preferLocal`.
//
// Plain functions, no DOM: loaded by the page and required by the tests.
(function (root) {
  const IGNORED_KEYS = new Set(['updatedAt']);

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
      return true;
    }
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual(a[k], b[k])) return false;
    return true;
  }

  // Sheet equality ignoring bookkeeping fields (updatedAt).
  function sameSheet(a, b) {
    return deepEqual(stripIgnored(a), stripIgnored(b));
  }
  function stripIgnored(s) {
    if (!isPlainObject(s)) return s;
    const out = {};
    for (const k of Object.keys(s)) if (!IGNORED_KEYS.has(k)) out[k] = s[k];
    return out;
  }

  const hasId = (x) => isPlainObject(x) && (typeof x.id === 'string' || typeof x.id === 'number');
  function isIdList(v) {
    return Array.isArray(v) && v.every(hasId);
  }

  function mergeValue(base, local, remote, opts) {
    if (deepEqual(local, remote)) return clone(local);
    if (opts.hasBase) {
      if (deepEqual(local, base)) return clone(remote);
      if (deepEqual(remote, base)) return clone(local);
    }
    const listsOk = isIdList(local) && isIdList(remote) && (base === undefined || isIdList(base) || !opts.hasBase);
    if (listsOk && (local.length || remote.length)) {
      return mergeIdList(isIdList(base) ? base : [], local, remote, opts);
    }
    if (isPlainObject(local) && isPlainObject(remote)) {
      return mergeObject(isPlainObject(base) ? base : {}, local, remote, opts);
    }
    if (local === undefined) return clone(remote);
    if (remote === undefined) return clone(local);
    return clone(opts.preferLocal === false ? remote : local);
  }

  function mergeObject(base, local, remote, opts) {
    const out = {};
    const keys = new Set([...Object.keys(local), ...Object.keys(remote), ...(opts.hasBase ? Object.keys(base) : [])]);
    for (const k of keys) {
      if (IGNORED_KEYS.has(k)) continue;
      const inL = Object.prototype.hasOwnProperty.call(local, k);
      const inR = Object.prototype.hasOwnProperty.call(remote, k);
      const inB = opts.hasBase && Object.prototype.hasOwnProperty.call(base, k);
      if (inL && inR) { out[k] = mergeValue(base[k], local[k], remote[k], opts); continue; }
      if (inL && !inR) {
        // Removed remotely, or added locally.
        if (inB && deepEqual(local[k], base[k])) continue;
        out[k] = clone(local[k]);
        continue;
      }
      if (inR && !inL) {
        if (inB && deepEqual(remote[k], base[k])) continue;
        out[k] = clone(remote[k]);
      }
    }
    return out;
  }

  function mergeIdList(base, local, remote, opts) {
    const byId = (list) => new Map(list.map(x => [String(x.id), x]));
    const B = byId(base), L = byId(local), R = byId(remote);
    const out = [];
    const seen = new Set();
    const decide = (id) => {
      const inB = opts.hasBase && B.has(id), inL = L.has(id), inR = R.has(id);
      if (inL && inR) return mergeValue(inB ? B.get(id) : undefined, L.get(id), R.get(id),
                                        inB ? opts : { ...opts, hasBase: false });
      if (inL) return (inB && deepEqual(L.get(id), B.get(id))) ? null : clone(L.get(id));
      if (inR) return (inB && deepEqual(R.get(id), B.get(id))) ? null : clone(R.get(id));
      return null;
    };
    // Keep this device's order, then slot in remote-only entries after the
    // entry that precedes them remotely (falls back to the end).
    for (const item of local) {
      const id = String(item.id);
      seen.add(id);
      const v = decide(id);
      if (v !== null) out.push(v);
    }
    let lastIdx = -1;
    for (const item of remote) {
      const id = String(item.id);
      if (seen.has(id)) {
        const at = out.findIndex(x => String(x.id) === id);
        if (at !== -1) lastIdx = at;
        continue;
      }
      seen.add(id);
      const v = decide(id);
      if (v === null) continue;
      out.splice(lastIdx + 1, 0, v);
      lastIdx += 1;
    }
    return out;
  }

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  // Public entry point. Returns a new object; inputs are not modified.
  function mergeSheets(base, local, remote, opts = {}) {
    const hasBase = isPlainObject(base);
    return mergeObject(hasBase ? base : {}, local || {}, remote || {}, {
      hasBase,
      preferLocal: opts.preferLocal !== false
    });
  }

  const api = { mergeSheets, sameSheet, deepEqual };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
