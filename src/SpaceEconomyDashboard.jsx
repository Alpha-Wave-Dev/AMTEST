import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Rocket, RefreshCw, Play, Pause, X, ExternalLink, AlertTriangle, Check,
  Activity, Search, ShieldAlert, Clock, ChevronRight, ChevronDown,
  Maximize2, ZoomIn, ZoomOut, Eye, EyeOff, Trash2,
} from 'lucide-react';

import { SEGMENTS, TRACKED_FIELDS, CONNECTION_STYLE } from './spaceData.js';
import { computeLayout, curvedPath } from './spaceLayout.js';
import {
  getOrInitDashboardState,
  saveDashboardState,
  clearDashboardState,
  pickStaleTargets,
  coverageStats,
  resolveInconsistency,
  fieldAgeMs,
} from './spaceStore.js';
import { runTick } from './spaceAgents.js';

// ── theme ────────────────────────────────────────────────────────────────────
const THEME = {
  bg:       '#04060d',
  bgSoft:   '#0a0f1c',
  panel:    '#0d1424',
  panelHi:  '#121a2e',
  border:   '#1f2a44',
  borderHi: '#2d3a5a',
  text:     '#dbe4f5',
  textDim:  '#8595b5',
  textVDim: '#566584',
  accent:   '#5cd5ff',
  ok:       '#34d399',
  warn:     '#fbbf24',
  danger:   '#f87171',
};

const STAGE_STYLE = {
  public:        { fill: '#5cd5ff', label: 'Public',       r: 7 },
  late_private:  { fill: '#a78bfa', label: 'Late Private', r: 8 },
  prime:         { fill: '#fbbf24', label: 'Prime',        r: 8 },
  growth:        { fill: '#f472b6', label: 'Growth',       r: 6 },
  early:         { fill: '#34d399', label: 'Early',        r: 5 },
  seed:          { fill: '#64748b', label: 'Seed',         r: 4 },
};

// Field freshness colour ramp
function freshnessColor(ageMs) {
  if (!isFinite(ageMs)) return THEME.danger;
  const h = ageMs / 3600000;
  if (h < 6) return THEME.ok;
  if (h < 24) return '#a3e635';
  if (h < 48) return THEME.warn;
  return THEME.danger;
}
function freshnessLabel(ageMs) {
  if (!isFinite(ageMs)) return 'never refreshed';
  const h = ageMs / 3600000;
  if (h < 1) return `${Math.round(ageMs / 60000)}m ago`;
  if (h < 48) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// Deterministic PRNG for the starfield
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SpaceEconomyDashboard() {
  const [state, setStateRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [showDrawer, setShowDrawer] = useState(true);
  const [drawerTab, setDrawerTab] = useState('log'); // 'log' | 'queue'
  const [running, setRunning] = useState(false);
  const [filterStage, setFilterStage] = useState(null); // optional stage filter
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [activeConnTypes, setActiveConnTypes] = useState(new Set(Object.keys(CONNECTION_STYLE)));
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1600, h: 1000 });
  const [panState, setPanState] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const stateRef = useRef(state);
  const intervalRef = useRef(null);
  const svgRef = useRef(null);

  // setState wrapper that also persists & keeps ref in sync
  const setState = useCallback((updater) => {
    setStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      stateRef.current = next;
      // fire-and-forget persistence
      if (next) saveDashboardState(next);
      return next;
    });
  }, []);
  const getState = useCallback(() => stateRef.current, []);

  // Live "now" — updates every 30s so age labels stay accurate without impure render-time Date.now()
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      const s = await getOrInitDashboardState();
      stateRef.current = s;
      setStateRaw(s);
      setLoading(false);
    })();
  }, []);

  // Tick
  const triggerTick = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setStatusMsg('Tick in progress…');
    try {
      await runTick(getState, setState);
      setStatusMsg('Tick complete.');
    } catch (err) {
      setStatusMsg(`Tick failed: ${err.message}`);
    } finally {
      setRunning(false);
      setTimeout(() => setStatusMsg(''), 4000);
    }
  }, [running, getState, setState]);

  // Auto-tick scheduler (page-open only)
  useEffect(() => {
    if (!state) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!state.settings.autoRefresh) return;
    const ms = (state.settings.tickIntervalMin || 30) * 60 * 1000;
    intervalRef.current = setInterval(() => {
      if (!running) triggerTick();
    }, ms);
    return () => intervalRef.current && clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.settings.autoRefresh, state?.settings.tickIntervalMin]);

  // Layout (recomputed only when window-equivalent changes; segments/companies are static)
  const layout = useMemo(() => computeLayout({ width: 1600, height: 1000 }), []);

  // Starfield
  const stars = useMemo(() => {
    const rand = mulberry32(42);
    const out = [];
    for (let i = 0; i < 220; i++) {
      out.push({
        x: rand() * 1600,
        y: rand() * 1000,
        r: 0.4 + rand() * 1.4,
        o: 0.15 + rand() * 0.65,
      });
    }
    return out;
  }, []);

  // Build edge list (deduped) with from/to node positions
  const edges = useMemo(() => {
    if (!state) return [];
    const seen = new Set();
    const out = [];
    for (const co of Object.values(state.companies)) {
      for (const conn of co.connections) {
        if (conn.direction !== 'out') continue;
        const key = `${conn.from}|${conn.to}|${conn.type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const a = layout.nodes[conn.from];
        const b = layout.nodes[conn.to];
        if (!a || !b) continue;
        out.push({ a, b, type: conn.type, path: curvedPath(a, b, layout.cx, layout.cy) });
      }
    }
    return out;
  }, [state, layout]);

  // Stats
  const stats = useMemo(() => state ? coverageStats(state) : null, [state]);

  // Hover-related sets
  const focusId = hoveredId || selectedId;
  const focusNeighbors = useMemo(() => {
    if (!state || !focusId) return new Set();
    const co = state.companies[focusId];
    if (!co) return new Set();
    const set = new Set([focusId]);
    for (const c of co.connections) {
      set.add(c.from === focusId ? c.to : c.from);
    }
    return set;
  }, [state, focusId]);

  // Pan / zoom handlers
  const onWheel = (e) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
    const my = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;
    const newW = Math.min(3200, Math.max(400, viewBox.w * scale));
    const newH = Math.min(2000, Math.max(250, viewBox.h * scale));
    const nx = mx - ((e.clientX - rect.left) / rect.width) * newW;
    const ny = my - ((e.clientY - rect.top) / rect.height) * newH;
    setViewBox({ x: nx, y: ny, w: newW, h: newH });
  };
  const onMouseDown = (e) => {
    if (e.target.closest('[data-node]')) return;
    setPanState({ startX: e.clientX, startY: e.clientY, vb: { ...viewBox } });
  };
  const onMouseMove = (e) => {
    if (!panState) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - panState.startX) / rect.width) * panState.vb.w;
    const dy = ((e.clientY - panState.startY) / rect.height) * panState.vb.h;
    setViewBox({ ...panState.vb, x: panState.vb.x - dx, y: panState.vb.y - dy });
  };
  const onMouseUp = () => setPanState(null);
  const resetView = () => setViewBox({ x: 0, y: 0, w: 1600, h: 1000 });
  const zoom = (factor) => {
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    const w = Math.min(3200, Math.max(400, viewBox.w * factor));
    const h = Math.min(2000, Math.max(250, viewBox.h * factor));
    setViewBox({ x: cx - w / 2, y: cy - h / 2, w, h });
  };

  if (loading || !state) {
    return (
      <div style={{ background: THEME.bg, color: THEME.text, height: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Rocket size={20} /> Loading Space Economy map…
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: THEME.bg, color: THEME.text, height: '100vh', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <TopBar
        state={state}
        stats={stats}
        running={running}
        statusMsg={statusMsg}
        now={now}
        onTickNow={triggerTick}
        onToggleAuto={() => setState(s => ({ ...s, settings: { ...s.settings, autoRefresh: !s.settings.autoRefresh } }))}
        onChangeInterval={(min) => setState(s => ({ ...s, settings: { ...s.settings, tickIntervalMin: min } }))}
        onChangeBudget={(n) => setState(s => ({ ...s, settings: { ...s.settings, perTickFieldBudget: n } }))}
        onReset={async () => {
          if (!confirm('Wipe all gathered data and reseed? This cannot be undone.')) return;
          await clearDashboardState();
          const s = await getOrInitDashboardState();
          stateRef.current = s; setStateRaw(s);
        }}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <MapControls
            onZoomIn={() => zoom(0.85)}
            onZoomOut={() => zoom(1.18)}
            onReset={resetView}
            showAllLabels={showAllLabels}
            setShowAllLabels={setShowAllLabels}
            activeConnTypes={activeConnTypes}
            setActiveConnTypes={setActiveConnTypes}
            filterStage={filterStage}
            setFilterStage={setFilterStage}
          />
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', cursor: panState ? 'grabbing' : 'grab', display: 'block', userSelect: 'none' }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              <radialGradient id="bgGrad" cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor="#0a1530" stopOpacity="1" />
                <stop offset="100%" stopColor="#020410" stopOpacity="1" />
              </radialGradient>
              <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {SEGMENTS.map(seg => (
                <radialGradient key={seg.id} id={`neb-${seg.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%"  stopColor={seg.color} stopOpacity="0.18" />
                  <stop offset="55%" stopColor={seg.color} stopOpacity="0.05" />
                  <stop offset="100%" stopColor={seg.color} stopOpacity="0" />
                </radialGradient>
              ))}
            </defs>

            <rect x="0" y="0" width="1600" height="1000" fill="url(#bgGrad)" />
            {stars.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#dbeafe" opacity={s.o} />
            ))}

            {/* Segment nebulae */}
            {SEGMENTS.map(seg => {
              const p = layout.segPositions[seg.id];
              return <circle key={seg.id} cx={p.x} cy={p.y} r={layout.clusterRadius * 1.6} fill={`url(#neb-${seg.id})`} />;
            })}

            {/* Segment labels */}
            {SEGMENTS.map(seg => {
              const p = layout.segPositions[seg.id];
              // anchor label outside the cluster
              const labelR = layout.clusterRadius + 28;
              const lx = p.x + Math.cos(p.angle) * labelR;
              const ly = p.y + Math.sin(p.angle) * labelR;
              return (
                <g key={seg.id} style={{ pointerEvents: 'none' }}>
                  <text x={lx} y={ly} fill={seg.color} fontSize="14" fontWeight="600"
                    textAnchor="middle" letterSpacing="1.4" style={{ textTransform: 'uppercase' }}>
                    {seg.name}
                  </text>
                </g>
              );
            })}

            {/* Edges */}
            <g>
              {edges.map((e, i) => {
                if (!activeConnTypes.has(e.type)) return null;
                const dim = focusId && !(focusNeighbors.has(e.a.id) && focusNeighbors.has(e.b.id));
                const focus = focusId && focusNeighbors.has(e.a.id) && focusNeighbors.has(e.b.id);
                const style = CONNECTION_STYLE[e.type];
                return (
                  <path
                    key={i}
                    d={e.path}
                    fill="none"
                    stroke={style.color}
                    strokeWidth={focus ? 1.8 : 0.7}
                    strokeOpacity={dim ? 0.06 : (focus ? 0.85 : 0.28)}
                    strokeDasharray={style.dash}
                    style={{ transition: 'stroke-opacity .15s' }}
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g>
              {Object.values(layout.nodes).map(n => {
                const co = state.companies[n.id];
                if (!co) return null;
                if (filterStage && co.stage !== filterStage) return null;
                const stage = STAGE_STYLE[co.stage] || STAGE_STYLE.growth;
                const isFocus = focusId && focusNeighbors.has(n.id);
                const dim = focusId && !isFocus;
                const isCenter = focusId === n.id;
                return (
                  <g
                    key={n.id}
                    data-node="1"
                    transform={`translate(${n.x}, ${n.y})`}
                    style={{ cursor: 'pointer', opacity: dim ? 0.25 : 1, transition: 'opacity .15s' }}
                    onMouseEnter={() => setHoveredId(n.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedId(n.id)}
                  >
                    <circle r={stage.r + 6} fill={stage.fill} opacity="0.12" filter="url(#nodeGlow)" />
                    <circle r={stage.r} fill={stage.fill} stroke={isCenter ? '#ffffff' : '#0a1226'} strokeWidth="1.5"
                            filter={isFocus ? 'url(#strongGlow)' : 'url(#nodeGlow)'} />
                    {(showAllLabels || isFocus) && (
                      <text
                        x="0" y={stage.r + 14}
                        fill={isCenter ? '#fff' : THEME.text}
                        fontSize="11"
                        fontWeight={isCenter ? 700 : 500}
                        textAnchor="middle"
                        style={{ paintOrder: 'stroke', stroke: '#02030a', strokeWidth: 3, strokeLinejoin: 'round' }}
                      >
                        {n.name}{n.ticker ? ` · ${n.ticker}` : ''}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          <MapLegend />
        </div>

        {showDrawer && (
          <AgentDrawer
            state={state}
            tab={drawerTab}
            setTab={setDrawerTab}
            onClose={() => setShowDrawer(false)}
            onSelectCompany={(id) => setSelectedId(id)}
            onResolve={(id) => setState(s => resolveInconsistency(s, id))}
          />
        )}
        {!showDrawer && (
          <button
            onClick={() => setShowDrawer(true)}
            style={{ position: 'absolute', right: 12, top: 80, background: THEME.panel, border: `1px solid ${THEME.border}`, color: THEME.text, padding: '8px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <Activity size={14} /> Agent Activity
          </button>
        )}
      </div>

      {selectedId && (
        <CompanyModal
          company={state.companies[selectedId]}
          allCompanies={state.companies}
          now={now}
          onClose={() => setSelectedId(null)}
          onSelectOther={(id) => setSelectedId(id)}
          onRefreshNow={async () => {
            // queue this company for the next tick by forcing its fields' updatedAt back
            setState(s => {
              const co = s.companies[selectedId];
              const fields = { ...co.fields };
              for (const f of TRACKED_FIELDS) {
                fields[f.id] = { ...fields[f.id], updatedAt: 0 };
              }
              return { ...s, companies: { ...s.companies, [selectedId]: { ...co, fields } } };
            });
            // fire a tick (with budget set to cover this company's 7 fields)
            await runTick(getState, setState, { budget: TRACKED_FIELDS.length });
          }}
        />
      )}
    </div>
  );
}

// ── TOP BAR ─────────────────────────────────────────────────────────────────
function TopBar({ state, stats, running, statusMsg, now, onTickNow, onToggleAuto, onChangeInterval, onChangeBudget, onReset }) {
  const { autoRefresh, tickIntervalMin, perTickFieldBudget, fullSweepTargetHours } = state.settings;
  const sweepMath = Math.round((stats.total / perTickFieldBudget) * (tickIntervalMin / 60));
  const lastTick = state.meta.lastTickAt ? freshnessLabel(now - state.meta.lastTickAt) : 'never';
  return (
    <div style={{ borderBottom: `1px solid ${THEME.border}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', background: THEME.bgSoft }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: 'linear-gradient(135deg,#5cd5ff,#a78bfa)', display: 'grid', placeItems: 'center' }}>
          <Rocket size={16} color="#04060d" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>Space Economy · Value Chain Map</div>
          <div style={{ fontSize: 11, color: THEME.textDim }}>
            {Object.keys(state.companies).length} companies · {SEGMENTS.length} segments · self-iterating since {new Date(state.meta.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <Stat label="populated" value={`${stats.populated}/${stats.total}`} pct={stats.populated / stats.total} />
      <Stat label="fresh (<6h)" value={`${stats.fresh}/${stats.total}`} pct={stats.fresh / stats.total} good />
      <Stat label="stale (>48h)" value={`${stats.stale}/${stats.total}`} pct={stats.stale / stats.total} bad />
      <Stat label="oldest field" value={freshnessLabel(stats.oldestAgeMs)} />
      <Stat label="last tick" value={lastTick} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: `1px solid ${THEME.border}`, borderRadius: 6 }}>
        <Clock size={12} color={THEME.textDim} />
        <span style={{ fontSize: 11, color: THEME.textDim }}>tick every</span>
        <input type="number" min={5} max={360} value={tickIntervalMin}
          onChange={(e) => onChangeInterval(Math.max(5, Math.min(360, parseInt(e.target.value || '30', 10))))}
          style={{ width: 50, background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`, borderRadius: 4, padding: '2px 4px', fontSize: 11 }} />
        <span style={{ fontSize: 11, color: THEME.textDim }}>min · </span>
        <span style={{ fontSize: 11, color: THEME.textDim }}>budget</span>
        <input type="number" min={1} max={30} value={perTickFieldBudget}
          onChange={(e) => onChangeBudget(Math.max(1, Math.min(30, parseInt(e.target.value || '6', 10))))}
          style={{ width: 38, background: THEME.panel, color: THEME.text, border: `1px solid ${THEME.border}`, borderRadius: 4, padding: '2px 4px', fontSize: 11 }} />
        <span style={{ fontSize: 11, color: THEME.textVDim, marginLeft: 2 }}
          title={`At this rate, a full sweep of all ${stats.total} field-units takes ~${sweepMath}h. Target is ${fullSweepTargetHours}h.`}>
          ~{sweepMath}h/sweep
        </span>
      </div>

      <button onClick={onToggleAuto}
        style={{ ...btn(autoRefresh ? THEME.ok : null), color: autoRefresh ? '#04241a' : THEME.text }}>
        {autoRefresh ? <Pause size={12} /> : <Play size={12} />}
        {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
      </button>

      <button onClick={onTickNow} disabled={running} style={{ ...btn(THEME.accent), color: '#04060d', opacity: running ? 0.6 : 1 }}>
        <RefreshCw size={12} className={running ? 'spin' : ''} />
        {running ? 'Ticking…' : 'Tick now'}
      </button>

      <button onClick={onReset} title="Reset all data" style={btn()}>
        <Trash2 size={12} /> Reset
      </button>

      {statusMsg && <div style={{ fontSize: 11, color: THEME.textDim }}>{statusMsg}</div>}

      <style>{`@keyframes spinkf { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spinkf 1.2s linear infinite; }`}</style>
    </div>
  );
}

function btn(accent) {
  return {
    background: accent || THEME.panel,
    color: accent ? '#04060d' : THEME.text,
    border: `1px solid ${accent || THEME.border}`,
    padding: '6px 10px',
    fontSize: 11,
    borderRadius: 5,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 600,
    letterSpacing: 0.3,
  };
}

function Stat({ label, value, pct, good, bad }) {
  const tone = good ? THEME.ok : bad ? THEME.danger : THEME.text;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 70 }}>
      <span style={{ fontSize: 10, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: tone, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      {pct != null && (
        <div style={{ height: 2, width: 70, background: THEME.border, marginTop: 2 }}>
          <div style={{ height: 2, width: `${Math.round(pct * 100)}%`, background: tone, transition: 'width .3s' }} />
        </div>
      )}
    </div>
  );
}

// ── MAP CONTROLS ────────────────────────────────────────────────────────────
function MapControls({ onZoomIn, onZoomOut, onReset, showAllLabels, setShowAllLabels, activeConnTypes, setActiveConnTypes, filterStage, setFilterStage }) {
  return (
    <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 5 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={onZoomIn}  style={iconBtn()} title="Zoom in"><ZoomIn size={13} /></button>
        <button onClick={onZoomOut} style={iconBtn()} title="Zoom out"><ZoomOut size={13} /></button>
        <button onClick={onReset}   style={iconBtn()} title="Reset view"><Maximize2 size={13} /></button>
        <button onClick={() => setShowAllLabels(v => !v)} style={iconBtn(showAllLabels)}
          title={showAllLabels ? 'Hide labels' : 'Show all labels'}>
          {showAllLabels ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      </div>
      <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: 8, fontSize: 10, color: THEME.textDim, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 230 }}>
        <div style={{ fontWeight: 700, color: THEME.text, letterSpacing: 1.0, textTransform: 'uppercase' }}>Connection types</div>
        {Object.entries(CONNECTION_STYLE).map(([k, v]) => (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={activeConnTypes.has(k)} onChange={() => {
              setActiveConnTypes(prev => {
                const next = new Set(prev);
                next.has(k) ? next.delete(k) : next.add(k);
                return next;
              });
            }} />
            <span style={{ width: 16, height: 2, background: v.color, display: 'inline-block' }} />
            <span>{v.label}</span>
          </label>
        ))}
      </div>
      <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: 8, fontSize: 10, color: THEME.textDim, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 230 }}>
        <div style={{ fontWeight: 700, color: THEME.text, letterSpacing: 1.0, textTransform: 'uppercase' }}>Filter by stage</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterStage(null)} style={{ ...iconBtn(filterStage == null), padding: '2px 6px', fontSize: 10 }}>all</button>
          {Object.entries(STAGE_STYLE).map(([k, v]) => (
            <button key={k} onClick={() => setFilterStage(k)} style={{ ...iconBtn(filterStage === k), padding: '2px 6px', fontSize: 10, color: filterStage === k ? '#04060d' : v.fill }}>
              {v.label.toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function iconBtn(active) {
  return {
    background: active ? THEME.accent : THEME.panel,
    color: active ? '#04060d' : THEME.text,
    border: `1px solid ${active ? THEME.accent : THEME.border}`,
    padding: 5,
    borderRadius: 4,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  };
}

// ── LEGEND ──────────────────────────────────────────────────────────────────
function MapLegend() {
  return (
    <div style={{ position: 'absolute', left: 12, bottom: 12, background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ fontSize: 10, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>Stage</span>
      {Object.entries(STAGE_STYLE).map(([k, v]) => (
        <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: v.fill, boxShadow: `0 0 6px ${v.fill}` }} />
          {v.label}
        </span>
      ))}
      <span style={{ fontSize: 10, color: THEME.textVDim, marginLeft: 8 }}>Drag to pan · scroll to zoom · click a node</span>
    </div>
  );
}

// ── AGENT DRAWER ────────────────────────────────────────────────────────────
function AgentDrawer({ state, tab, setTab, onClose, onSelectCompany, onResolve }) {
  const openIssues = state.inconsistencies.filter(i => i.status === 'open');
  return (
    <div style={{ width: 380, borderLeft: `1px solid ${THEME.border}`, background: THEME.bgSoft, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Activity size={14} color={THEME.accent} />
        <span style={{ fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>Agent Activity</span>
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={iconBtn()}><X size={13} /></button>
      </div>
      <div style={{ display: 'flex', borderBottom: `1px solid ${THEME.border}` }}>
        <DrawerTab active={tab === 'log'} onClick={() => setTab('log')} icon={<Search size={12} />} count={state.agentLog.length}>Activity log</DrawerTab>
        <DrawerTab active={tab === 'queue'} onClick={() => setTab('queue')} icon={<ShieldAlert size={12} />} count={openIssues.length} hot={openIssues.length > 0}>Inconsistency queue</DrawerTab>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {tab === 'log' && <ActivityLog log={state.agentLog} onSelectCompany={onSelectCompany} companies={state.companies} />}
        {tab === 'queue' && <InconsistencyQueue items={state.inconsistencies} onSelectCompany={onSelectCompany} onResolve={onResolve} />}
      </div>
      <UpcomingTargets state={state} onSelectCompany={onSelectCompany} />
    </div>
  );
}
function DrawerTab({ active, onClick, icon, children, count, hot }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, background: active ? THEME.panel : 'transparent', color: active ? THEME.text : THEME.textDim,
      border: 'none', borderBottom: `2px solid ${active ? THEME.accent : 'transparent'}`,
      padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase',
    }}>
      {icon} {children}
      {count != null && <span style={{ background: hot ? THEME.danger : THEME.border, color: hot ? '#1a0808' : THEME.textDim, fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>{count}</span>}
    </button>
  );
}
function ActivityLog({ log, onSelectCompany, companies }) {
  if (!log.length) {
    return <div style={{ color: THEME.textDim, padding: 12, fontSize: 12 }}>No agent activity yet. Press <strong>Tick now</strong> to start.</div>;
  }
  const kindStyle = {
    tick:   { icon: <RefreshCw size={11} />, color: THEME.accent },
    seek:   { icon: <Search size={11} />,    color: '#a78bfa' },
    verify: { icon: <ShieldAlert size={11} />,color: THEME.warn },
    patch:  { icon: <Check size={11} />,     color: THEME.ok },
    error:  { icon: <AlertTriangle size={11}/>,color: THEME.danger },
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {log.map((l, i) => {
        const k = kindStyle[l.kind] || kindStyle.seek;
        const co = l.companyId ? companies[l.companyId] : null;
        return (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 8px', borderRadius: 4, background: THEME.panel, border: `1px solid ${THEME.border}` }}>
            <div style={{ color: k.color, paddingTop: 1 }}>{k.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: THEME.text, lineHeight: 1.35 }}>
                {co && <button onClick={() => onSelectCompany(co.id)} style={{ background: 'none', color: THEME.accent, border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600 }}>{co.name}</button>}
                {co && ' '}{l.summary}
              </div>
              <div style={{ fontSize: 10, color: THEME.textVDim }}>{new Date(l.ts).toLocaleTimeString()} · {l.kind}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function InconsistencyQueue({ items, onSelectCompany, onResolve }) {
  const open = items.filter(i => i.status === 'open');
  if (!open.length) {
    return <div style={{ color: THEME.textDim, padding: 12, fontSize: 12 }}>No open inconsistencies. The Verifier hasn't flagged anything yet.</div>;
  }
  const statusStyle = {
    inconsistent: { color: THEME.danger, label: 'INCONSISTENT' },
    missing:      { color: THEME.warn,   label: 'MISSING' },
    stale:        { color: THEME.warn,   label: 'STALE' },
    weak_source:  { color: '#a78bfa',    label: 'WEAK SOURCE' },
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {open.map(it => {
        const s = statusStyle[it.status] || statusStyle.weak_source;
        return (
          <div key={it.id} style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: 0.5 }}>{s.label}</span>
              <button onClick={() => onSelectCompany(it.companyId)} style={{ background: 'none', color: THEME.accent, border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                {it.companyName}
              </button>
              <span style={{ color: THEME.textDim, fontSize: 11 }}>· {it.fieldLabel}</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => onResolve(it.id)} style={{ ...iconBtn(), fontSize: 10, padding: '2px 6px' }}>
                <Check size={11} /> resolve
              </button>
            </div>
            {it.notes && <div style={{ fontSize: 11, color: THEME.text, marginTop: 4 }}>{it.notes}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
              <div style={{ fontSize: 10, color: THEME.textVDim }}>
                <div style={{ color: THEME.textDim, textTransform: 'uppercase' }}>before</div>
                <div style={{ color: THEME.text }}>{it.prev ? String(it.prev) : '—'}</div>
              </div>
              <div style={{ fontSize: 10, color: THEME.textVDim }}>
                <div style={{ color: THEME.textDim, textTransform: 'uppercase' }}>after</div>
                <div style={{ color: THEME.text }}>{it.next ? String(it.next) : '—'}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function UpcomingTargets({ state, onSelectCompany }) {
  const [open, setOpen] = useState(false);
  const targets = useMemo(() => pickStaleTargets(state, 12), [state]);
  return (
    <div style={{ borderTop: `1px solid ${THEME.border}` }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', background: 'none', border: 'none', color: THEME.textDim, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Next-up refresh queue ({targets.length})
      </button>
      {open && (
        <div style={{ padding: 8, paddingTop: 0, maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {targets.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '3px 6px', borderRadius: 3, background: THEME.panel }}>
              <span style={{ color: THEME.textVDim, width: 18 }}>{i + 1}.</span>
              <button onClick={() => onSelectCompany(t.companyId)} style={{ background: 'none', color: THEME.accent, border: 'none', padding: 0, cursor: 'pointer' }}>{t.companyName}</button>
              <span style={{ color: THEME.textDim }}>· {t.fieldLabel}</span>
              <div style={{ flex: 1 }} />
              <span style={{ color: freshnessColor(t.ageMs), fontSize: 10 }}>{freshnessLabel(t.ageMs)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── COMPANY MODAL ───────────────────────────────────────────────────────────
function CompanyModal({ company, allCompanies, now, onClose, onSelectOther, onRefreshNow }) {
  const stage = STAGE_STYLE[company.stage] || STAGE_STYLE.growth;
  const seg = SEGMENTS.find(s => s.id === company.segment);
  const [refreshing, setRefreshing] = useState(false);

  // de-dupe connections, attach counterpart company
  const conns = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const c of company.connections) {
      const partnerId = c.from === company.id ? c.to : c.from;
      const key = `${partnerId}|${c.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...c, partner: allCompanies[partnerId] });
    }
    return out;
  }, [company, allCompanies]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(2,4,12,0.85)', backdropFilter: 'blur(4px)',
      zIndex: 100, display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(960px, 100%)', maxHeight: '90vh', background: THEME.panel, border: `1px solid ${THEME.borderHi}`,
        borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: `0 0 80px ${stage.fill}33, 0 24px 80px rgba(0,0,0,0.6)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: `1px solid ${THEME.border}` }}>
          <div style={{ width: 38, height: 38, borderRadius: 19, background: stage.fill, opacity: 0.95, display: 'grid', placeItems: 'center', boxShadow: `0 0 20px ${stage.fill}` }}>
            <Rocket size={18} color="#04060d" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: THEME.text }}>{company.name}</h2>
              {company.ticker && <span style={{ fontSize: 13, color: THEME.accent, fontFamily: 'monospace' }}>{company.ticker}</span>}
              <span style={{ fontSize: 11, color: stage.fill, padding: '2px 8px', border: `1px solid ${stage.fill}`, borderRadius: 4, letterSpacing: 0.8, textTransform: 'uppercase' }}>{stage.label}</span>
            </div>
            <div style={{ fontSize: 12, color: THEME.textDim, marginTop: 3 }}>
              <span style={{ color: seg?.color }}>{seg?.name}</span> · {company.hq} · founded {company.founded}
              {company.tags?.length > 0 && <> · {company.tags.map(t => <span key={t} style={{ marginLeft: 6, fontSize: 10, color: THEME.textVDim, padding: '1px 5px', border: `1px solid ${THEME.border}`, borderRadius: 3 }}>{t}</span>)}</>}
            </div>
          </div>
          <button onClick={async () => { setRefreshing(true); try { await onRefreshNow(); } finally { setRefreshing(false); } }}
            disabled={refreshing}
            style={{ ...btn(THEME.accent), color: '#04060d', opacity: refreshing ? 0.6 : 1 }}>
            <RefreshCw size={12} className={refreshing ? 'spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh now'}
          </button>
          <button onClick={onClose} style={iconBtn()}><X size={14} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TRACKED_FIELDS.map(f => {
              const fld = company.fields[f.id];
              return <FieldCard key={f.id} field={f} value={fld} />;
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Value-chain connections ({conns.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 380, overflowY: 'auto' }}>
                {conns.length === 0 && <div style={{ color: THEME.textVDim, fontSize: 12 }}>No connections recorded yet.</div>}
                {conns.map((c, i) => {
                  const cs = CONNECTION_STYLE[c.type];
                  if (!c.partner) return null;
                  const verb = c.direction === 'out' ? cs.label : reverseLabel(c.type);
                  return (
                    <button key={i} onClick={() => onSelectOther(c.partner.id)} style={{
                      background: THEME.panelHi, border: `1px solid ${THEME.border}`, borderRadius: 5,
                      padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: THEME.text, textAlign: 'left',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: 3, background: cs.color, boxShadow: `0 0 6px ${cs.color}` }} />
                      <span style={{ fontSize: 10, color: cs.color, width: 100, textTransform: 'uppercase', letterSpacing: 0.5 }}>{verb}</span>
                      <span style={{ fontSize: 13, color: THEME.text, fontWeight: 500 }}>{c.partner.name}</span>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 10, color: THEME.textVDim }}>{(SEGMENTS.find(s => s.id === c.partner.segment) || {}).name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 20px', borderTop: `1px solid ${THEME.border}`, fontSize: 11, color: THEME.textVDim, display: 'flex', justifyContent: 'space-between' }}>
          <span>Each field is independently refreshed by the Seeker agent and audited by the Verifier. Click <em>Refresh now</em> to queue all fields for immediate re-fetch.</span>
          <span>created {new Date(company.createdAt).toLocaleDateString()} · last updated {freshnessLabel(now - company.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

function reverseLabel(type) {
  switch (type) {
    case 'launches_for': return 'launched by';
    case 'supplies':     return 'supplied by';
    case 'customer_of':  return 'sells to';
    case 'invested_in':  return 'investor';
    case 'subsidiary_of':return 'parent of';
    default:             return CONNECTION_STYLE[type]?.label || type;
  }
}

function FieldCard({ field, value }) {
  const age = fieldAgeMs(value);
  const color = freshnessColor(age);
  const stat = value.verifierStatus;
  const statusStyle = {
    ok:           { color: THEME.ok,     label: 'verified' },
    unverified:   { color: THEME.textDim,label: 'unverified' },
    inconsistent: { color: THEME.danger, label: 'inconsistent' },
    missing:      { color: THEME.warn,   label: 'missing' },
    stale:        { color: THEME.warn,   label: 'stale' },
    weak_source:  { color: '#a78bfa',    label: 'weak source' },
  }[stat] || { color: THEME.textDim, label: stat };

  return (
    <div style={{ background: THEME.panelHi, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>{field.label}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: statusStyle.color, padding: '1px 6px', border: `1px solid ${statusStyle.color}`, borderRadius: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{statusStyle.label}</span>
        <span title={value.updatedAt ? new Date(value.updatedAt).toLocaleString() : 'never refreshed'}
          style={{ fontSize: 10, color, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: color, boxShadow: `0 0 6px ${color}` }} />
          {freshnessLabel(age)}
        </span>
      </div>
      <div style={{ fontSize: 13, color: value.value ? THEME.text : THEME.textVDim, lineHeight: 1.5 }}>
        {value.value || <em style={{ color: THEME.textVDim }}>not yet gathered — queue this company to populate</em>}
      </div>
      {value.verifierNotes && (
        <div style={{ marginTop: 6, fontSize: 11, color: statusStyle.color, fontStyle: 'italic', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <ShieldAlert size={11} style={{ flexShrink: 0, marginTop: 2 }} />
          {value.verifierNotes}
        </div>
      )}
      {value.sources?.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {value.sources.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: THEME.accent, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, padding: '1px 6px', border: `1px solid ${THEME.border}`, borderRadius: 3 }}>
              <ExternalLink size={9} /> {sourceLabel(src)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
function sourceLabel(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch { return url.slice(0, 40); }
}
