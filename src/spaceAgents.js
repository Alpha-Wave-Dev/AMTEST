// Seeker + Verifier agents for the Space Economy Dashboard.
//
// Seeker: web-grounded research agent. Given a company and a list of fields,
//   returns a structured JSON patch with values + sources. Uses web_search.
//
// Verifier: adversarial check. Given the prior value and the proposed new
//   value, flags inconsistencies, missing fields, hallucinations, or stale
//   data. Outputs per-field verdicts.
//
// runTick: picks the stalest fields globally, dispatches Seeker + Verifier,
//   applies patches, logs inconsistencies.

import { TRACKED_FIELDS } from './spaceData.js';
import {
  pickStaleTargets,
  applyFieldPatch,
  appendLog,
  appendInconsistency,
} from './spaceStore.js';

const API_URL = (typeof window !== 'undefined' && window.storage)
  ? 'https://api.anthropic.com/v1/messages'   // Claude Code hosted env proxies auth
  : '/api/claude';                              // Vercel deployment proxy
const MODEL = 'claude-sonnet-4-20250514';

// Strip code fences / leading prose to recover JSON. Defensive.
function extractJSON(text) {
  if (!text) return null;
  // Try direct parse first
  try { return JSON.parse(text); } catch { /* fall through */ }
  // Try fenced block
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch { /* fall through */ }
  }
  // Try first { ... last }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch { /* fall through */ }
  }
  return null;
}

async function callClaude({ system, user, useWebSearch = false, maxTokens = 1800 }) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  };
  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }];
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
  const searches = (data.content || []).filter(b => b.type === 'server_tool_use' && b.name === 'web_search');
  // Citations from web_search results, when present
  const citations = [];
  for (const block of data.content || []) {
    for (const c of block.citations || []) {
      if (c.url) citations.push({ url: c.url, title: c.title || c.url });
    }
  }
  return { text: textBlocks.join('\n').trim(), searches: searches.length, citations };
}

// ── SEEKER ───────────────────────────────────────────────────────────────────

const SEEKER_SYSTEM = `You are SEEKER, the research agent for an institutional space-economy intelligence dashboard.

Your job: for one company, refresh a specific set of fields with current, high-signal information. Use web_search to ground every claim in actual recent sources. Prefer primary sources: 10-K/10-Q/8-K, S-1, investor decks, the company's own announcements, named-source trade press (Payload, SpaceNews, Via Satellite, Reuters, Bloomberg, FT).

Hard rules:
- Output ONLY a single JSON object. No prose, no markdown fences.
- Every field's value must be 1-3 short sentences max — institutional shorthand, not marketing.
- Each field must include a "sources" array (1-3 URLs you actually consulted). Empty array if you genuinely could not find a source.
- If you cannot verify a field, set "value" to null and "sources" to [] and add "note": "not found".
- Dates: use ISO "YYYY-MM-DD" or "YYYY-MM" when relevant.
- Numbers: keep the currency symbol and units ("$1.2B", "12% gross margin", "350 sats on-orbit").
- Do NOT invent partnerships, raises, valuations, or financials. If unsure, return null.`;

function buildSeekerPrompt(company, fieldIds) {
  const fieldDefs = TRACKED_FIELDS.filter(f => fieldIds.includes(f.id));
  const fieldList = fieldDefs.map(f => `- "${f.id}": ${f.label}`).join('\n');
  return `Company: ${company.name}${company.ticker ? ` (${company.ticker})` : ''}
Segment: ${company.segment}
HQ: ${company.hq}
Founded: ${company.founded}

Refresh these fields with current information (as of ${new Date().toISOString().slice(0, 10)}):
${fieldList}

Return JSON of this exact shape:
{
  "${fieldDefs[0].id}": { "value": "...", "sources": ["url1", "url2"] }${fieldDefs.length > 1 ? ',\n  ...' : ''}
}

JSON ONLY. No prose.`;
}

export async function runSeeker(company, fieldIds, log = () => {}) {
  log({ kind: 'seek', companyId: company.id, summary: `Seeker → ${company.name}: ${fieldIds.join(', ')}` });
  const { text, citations } = await callClaude({
    system: SEEKER_SYSTEM,
    user: buildSeekerPrompt(company, fieldIds),
    useWebSearch: true,
    maxTokens: 2000,
  });
  const parsed = extractJSON(text);
  if (!parsed) {
    throw new Error('Seeker returned unparseable output');
  }
  // Normalize: ensure every requested field present, even if null
  const out = {};
  for (const id of fieldIds) {
    const v = parsed[id] || { value: null, sources: [] };
    out[id] = {
      value: v.value ?? null,
      sources: Array.isArray(v.sources) && v.sources.length ? v.sources : citations.map(c => c.url).slice(0, 2),
      note: v.note || null,
    };
  }
  return out;
}

// ── VERIFIER ─────────────────────────────────────────────────────────────────

const VERIFIER_SYSTEM = `You are VERIFIER, the adversarial QA agent for an institutional space-economy intelligence dashboard.

You receive a Seeker's proposed update for one company. Your job: detect inconsistencies, hallucinations, contradictions, suspicious specificity, or missing context. You compare the proposed values to:
1. The prior values (if any) — flag unexplained large deltas.
2. Internal consistency — financials vs valuation vs raise size should add up.
3. Plausibility — flag claims that look fabricated or anachronistic.
4. Source quality — flag fields with no sources or weak sources.

Output ONLY a single JSON object. For each field, return one of:
  "ok"           - clean, well-sourced, consistent
  "inconsistent" - contradicts prior or contradicts another field
  "missing"      - value is null/empty when it shouldn't be
  "stale"        - value still looks like old data
  "weak_source"  - claim is specific but not credibly sourced

Be brief — one sentence of "notes" per field maximum.`;

function buildVerifierPrompt(company, prevFields, newFields) {
  const items = Object.keys(newFields).map(id => {
    const def = TRACKED_FIELDS.find(f => f.id === id);
    const prev = prevFields[id];
    return `Field "${id}" (${def?.label}):
  prior value: ${prev?.value ? JSON.stringify(prev.value) : 'null'}
  prior updatedAt: ${prev?.updatedAt ? new Date(prev.updatedAt).toISOString() : 'never'}
  proposed value: ${JSON.stringify(newFields[id].value)}
  proposed sources: ${JSON.stringify(newFields[id].sources || [])}`;
  }).join('\n\n');

  return `Company: ${company.name}${company.ticker ? ` (${company.ticker})` : ''}

${items}

Return JSON of this exact shape:
{
  "${Object.keys(newFields)[0]}": { "status": "ok|inconsistent|missing|stale|weak_source", "notes": "..." }${Object.keys(newFields).length > 1 ? ',\n  ...' : ''}
}

JSON ONLY.`;
}

export async function runVerifier(company, prevFields, newFields, log = () => {}) {
  log({ kind: 'verify', companyId: company.id, summary: `Verifier → ${company.name}: ${Object.keys(newFields).join(', ')}` });
  const { text } = await callClaude({
    system: VERIFIER_SYSTEM,
    user: buildVerifierPrompt(company, prevFields, newFields),
    useWebSearch: false,
    maxTokens: 800,
  });
  const parsed = extractJSON(text);
  if (!parsed) {
    // soft-fail: treat all as unverified
    const out = {};
    for (const id of Object.keys(newFields)) {
      out[id] = { status: 'weak_source', notes: 'verifier output unparseable' };
    }
    return out;
  }
  // Normalize
  const out = {};
  for (const id of Object.keys(newFields)) {
    const v = parsed[id] || {};
    out[id] = {
      status: ['ok', 'inconsistent', 'missing', 'stale', 'weak_source'].includes(v.status) ? v.status : 'weak_source',
      notes: v.notes || null,
    };
  }
  return out;
}

// ── TICK SCHEDULER ───────────────────────────────────────────────────────────

// Process one company end-to-end: seek → verify → apply patches.
async function processCompany(companyId, fieldIds, getState, setState) {
  const company = getState().companies[companyId];
  if (!company) return;

  let seekerOut = null;
  try {
    seekerOut = await runSeeker(company, fieldIds, (entry) => {
      setState(s => appendLog(s, entry));
    });
  } catch (err) {
    setState(s => appendLog({ ...s, meta: { ...s.meta, failures: s.meta.failures + 1 } }, {
      kind: 'error', companyId, summary: `Seeker failed for ${company.name}: ${err.message}`,
    }));
    return;
  }

  const prevFields = {};
  for (const fid of fieldIds) prevFields[fid] = company.fields[fid];

  let verifierOut = null;
  try {
    verifierOut = await runVerifier(company, prevFields, seekerOut, (entry) => {
      setState(s => appendLog(s, entry));
    });
  } catch (err) {
    setState(s => appendLog(s, {
      kind: 'error', companyId, summary: `Verifier failed for ${company.name}: ${err.message}`,
    }));
    verifierOut = Object.fromEntries(fieldIds.map(id => [id, { status: 'weak_source', notes: 'verifier unreachable' }]));
  }

  setState(s => {
    let next = s;
    for (const fid of fieldIds) {
      const sk = seekerOut[fid];
      const vf = verifierOut[fid];
      next = applyFieldPatch(next, companyId, fid, {
        value: sk.value,
        sources: sk.sources,
      }, {
        verifierStatus: vf.status,
        verifierNotes: vf.notes,
        verifiedAt: Date.now(),
      });
      if (vf.status !== 'ok') {
        next = appendInconsistency(next, {
          companyId,
          companyName: company.name,
          field: fid,
          fieldLabel: TRACKED_FIELDS.find(f => f.id === fid)?.label,
          prev: prevFields[fid]?.value ?? null,
          next: sk.value,
          status: vf.status,
          notes: vf.notes,
          sources: sk.sources,
        });
      }
    }
    next = appendLog(next, { kind: 'patch', companyId, summary: `Patched ${fieldIds.length} fields on ${company.name}` });
    next = { ...next, meta: { ...next.meta, successes: next.meta.successes + 1 } };
    return next;
  });
}

// Run companies through processCompany with a fixed concurrency cap.
async function runWithConcurrency(items, concurrency, worker) {
  const queue = [...items];
  const active = [];
  while (queue.length || active.length) {
    while (active.length < concurrency && queue.length) {
      const item = queue.shift();
      const p = worker(item).finally(() => {
        const i = active.indexOf(p);
        if (i !== -1) active.splice(i, 1);
      });
      active.push(p);
    }
    if (active.length) await Promise.race(active);
  }
}

// Run one tick: pick stalest fields, group by company, seek + verify in parallel.
export async function runTick(getState, setState, opts = {}) {
  const state0 = getState();
  const budget = opts.budget ?? state0.settings.perTickFieldBudget ?? 6;
  const concurrency = opts.concurrency ?? state0.settings.perTickCompanyParallel ?? 3;
  const targets = pickStaleTargets(state0, budget);
  if (!targets.length) return;

  setState(s => appendLog({ ...s, meta: { ...s.meta, lastTickAt: Date.now(), ticks: s.meta.ticks + 1 } }, {
    kind: 'tick',
    summary: `Tick #${state0.meta.ticks + 1}: refreshing ${targets.length} fields across ${new Set(targets.map(t => t.companyId)).size} companies (×${concurrency} parallel)`,
  }));

  const byCompany = {};
  for (const t of targets) {
    (byCompany[t.companyId] = byCompany[t.companyId] || []).push(t.fieldId);
  }

  await runWithConcurrency(
    Object.entries(byCompany),
    concurrency,
    ([companyId, fieldIds]) => processCompany(companyId, fieldIds, getState, setState),
  );
}

// Loop ticks back-to-back until every field has been populated at least once
// (or we hit a hard tick cap). Used by the "Populate empty fields" CTA.
export async function runUntilPopulated(getState, setState, opts = {}) {
  const maxTicks = opts.maxTicks ?? 120;
  const budget = opts.budget ?? 20;
  const concurrency = opts.concurrency ?? 4;
  for (let i = 0; i < maxTicks; i++) {
    const s = getState();
    const empty = countEmptyFields(s);
    if (empty === 0) {
      setState(st => appendLog(st, { kind: 'tick', summary: 'Initial population complete — all fields populated at least once.' }));
      return;
    }
    setState(st => appendLog(st, { kind: 'tick', summary: `Burst tick ${i + 1}/${maxTicks} · ${empty} empty fields remaining` }));
    await runTick(getState, setState, { budget, concurrency });
  }
}

export function countEmptyFields(state) {
  let n = 0;
  for (const co of Object.values(state.companies)) {
    for (const f of TRACKED_FIELDS) {
      if (co.fields[f.id].value == null) n++;
    }
  }
  return n;
}
