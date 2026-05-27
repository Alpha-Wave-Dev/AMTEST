// Persistent store for the Space Economy Dashboard.
// Tries window.storage (Claude Code env) first, then falls back to
// localStorage (Vercel / static deploys).

import { COMPANIES, CONNECTIONS, TRACKED_FIELDS } from './spaceData.js';

const KEY = 'space:dashboard';
const SCHEMA_VERSION = 1;

// Storage adapter: prefers Claude Code env's window.storage, falls back to localStorage.
const storage = {
  async get(key) {
    if (typeof window === 'undefined') return null;
    if (window.storage?.get) {
      try { return await window.storage.get(key); } catch { /* fall through */ }
    }
    try {
      const v = window.localStorage?.getItem(key);
      return v ? { value: v } : null;
    } catch { return null; }
  },
  async set(key, value) {
    if (typeof window === 'undefined') return false;
    if (window.storage?.set) {
      try { await window.storage.set(key, value); return true; } catch { /* fall through */ }
    }
    try { window.localStorage?.setItem(key, value); return true; } catch { return false; }
  },
  async delete(key) {
    if (typeof window === 'undefined') return false;
    if (window.storage?.delete) {
      try { await window.storage.delete(key); } catch { /* fall through */ }
    }
    try { window.localStorage?.removeItem(key); return true; } catch { return false; }
  },
};

// Anchor the initial timestamps to ~36 hours ago so the first scheduler tick
// has actual work to do (prioritizing the stalest fields).
const SEED_AGE_MS = 36 * 60 * 60 * 1000;

function makeInitialState() {
  const now = Date.now();
  const seedAt = now - SEED_AGE_MS;

  const companies = {};
  for (const c of COMPANIES) {
    const fields = {};
    for (const f of TRACKED_FIELDS) {
      fields[f.id] = {
        value: null,             // populated by Seeker
        updatedAt: 0,            // never refreshed yet → maximally stale
        verifiedAt: 0,
        verifierStatus: 'unverified', // ok | inconsistent | missing | stale | unverified
        verifierNotes: null,
        sources: [],
      };
    }
    companies[c.id] = {
      ...c,
      fields,
      connections: [],            // populated below
      createdAt: seedAt,
      updatedAt: seedAt,
    };
  }
  // Attach connections both directions for fast lookup
  for (const conn of CONNECTIONS) {
    if (!companies[conn.from] || !companies[conn.to]) continue;
    companies[conn.from].connections.push({ ...conn, direction: 'out', addedAt: seedAt, source: 'seed' });
    companies[conn.to].connections.push({ ...conn, direction: 'in', addedAt: seedAt, source: 'seed' });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    companies,
    agentLog: [],                  // [{ ts, kind: 'seek'|'verify'|'tick'|'error', companyId, field, summary }]
    inconsistencies: [],           // [{ id, ts, companyId, field, prev, next, notes, status }]
    meta: {
      createdAt: now,
      lastTickAt: 0,
      lastFullSweepStartedAt: now,
      ticks: 0,
      successes: 0,
      failures: 0,
    },
    settings: {
      autoRefresh: true,            // ON by default — agents start working immediately
      tickIntervalMin: 15,          // tick every 15 min while page is open
      perTickFieldBudget: 14,       // 14 fields × 4 ticks/hr ≈ full sweep in ~7.5h
      perTickCompanyParallel: 3,    // process N companies in parallel per tick
      fullSweepTargetHours: 48,
    },
  };
}

export async function loadDashboardState() {
  try {
    const result = await storage.get(KEY);
    if (!result) return null;
    const parsed = JSON.parse(result.value);
    if (parsed?.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed;
  } catch (err) {
    console.warn('loadDashboardState failed', err);
    return null;
  }
}

export async function saveDashboardState(state) {
  try {
    return await storage.set(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('saveDashboardState failed', err);
    return false;
  }
}

export async function clearDashboardState() {
  try {
    await storage.delete(KEY);
    return true;
  } catch {
    return false;
  }
}

export async function getOrInitDashboardState() {
  const existing = await loadDashboardState();
  if (existing) return existing;
  const fresh = makeInitialState();
  await saveDashboardState(fresh);
  return fresh;
}

// Pure helpers ─────────────────────────────────────────────────────────────

export function fieldAgeMs(field, now = Date.now()) {
  if (!field || !field.updatedAt) return Infinity;
  return now - field.updatedAt;
}

// Returns the N stalest [{companyId, fieldId, ageMs, priority}], weighted by field priority.
export function pickStaleTargets(state, n) {
  const now = Date.now();
  const items = [];
  for (const companyId of Object.keys(state.companies)) {
    const co = state.companies[companyId];
    for (const f of TRACKED_FIELDS) {
      const fld = co.fields[f.id];
      const age = fieldAgeMs(fld, now);
      // weighted-age = age * priority. Treat Infinity as a very large number.
      const ageScore = age === Infinity ? 1e15 : age;
      items.push({
        companyId,
        companyName: co.name,
        fieldId: f.id,
        fieldLabel: f.label,
        ageMs: age,
        score: ageScore * f.priority,
      });
    }
  }
  items.sort((a, b) => b.score - a.score);
  return items.slice(0, n);
}

export function applyFieldPatch(state, companyId, fieldId, patch, options = {}) {
  const co = state.companies[companyId];
  if (!co || !co.fields[fieldId]) return state;
  const now = Date.now();
  const next = {
    ...state,
    companies: {
      ...state.companies,
      [companyId]: {
        ...co,
        updatedAt: now,
        fields: {
          ...co.fields,
          [fieldId]: {
            ...co.fields[fieldId],
            value: patch.value ?? co.fields[fieldId].value,
            updatedAt: now,
            sources: patch.sources ?? co.fields[fieldId].sources,
            verifierStatus: options.verifierStatus ?? co.fields[fieldId].verifierStatus,
            verifierNotes: options.verifierNotes ?? co.fields[fieldId].verifierNotes,
            verifiedAt: options.verifiedAt ?? co.fields[fieldId].verifiedAt,
          },
        },
      },
    },
  };
  return next;
}

export function appendLog(state, entry) {
  const trimmed = [{ ...entry, ts: entry.ts ?? Date.now() }, ...state.agentLog].slice(0, 250);
  return { ...state, agentLog: trimmed };
}

export function appendInconsistency(state, entry) {
  const item = { id: `i_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, status: 'open', ts: Date.now(), ...entry };
  const list = [item, ...state.inconsistencies].slice(0, 200);
  return { ...state, inconsistencies: list };
}

export function resolveInconsistency(state, id) {
  return {
    ...state,
    inconsistencies: state.inconsistencies.map(x => x.id === id ? { ...x, status: 'resolved', resolvedAt: Date.now() } : x),
  };
}

// Coverage stats for the header.
export function coverageStats(state) {
  const now = Date.now();
  const all = [];
  for (const co of Object.values(state.companies)) {
    for (const f of TRACKED_FIELDS) {
      const fld = co.fields[f.id];
      all.push({ age: fieldAgeMs(fld, now), populated: fld.value != null, status: fld.verifierStatus });
    }
  }
  const total = all.length;
  const populated = all.filter(x => x.populated).length;
  const fresh = all.filter(x => x.age < 6 * 3600 * 1000).length; // < 6h
  const stale = all.filter(x => x.age > 48 * 3600 * 1000).length;
  const oldestAgeMs = all.reduce((m, x) => Math.max(m, x.age === Infinity ? 0 : x.age), 0);
  return { total, populated, fresh, stale, oldestAgeMs };
}
