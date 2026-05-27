// Deterministic galaxy-cluster layout.
// Segments arranged radially around a center point; companies cluster within their segment.

import { SEGMENTS, COMPANIES } from './spaceData.js';

const TAU = Math.PI * 2;

// Sunflower spiral offsets (golden-angle) for stable, uncrowded layouts within a cluster.
function sunflower(i, total, radiusMax) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const r = radiusMax * Math.sqrt((i + 0.5) / total);
  const a = i * golden;
  return { dx: r * Math.cos(a), dy: r * Math.sin(a) };
}

export function computeLayout({ width, height }) {
  const cx = width / 2;
  const cy = height / 2;
  const ringRadius = Math.min(width, height) * 0.32;
  const clusterRadius = Math.min(width, height) * 0.11;

  // Segment centers
  const segPositions = {};
  for (const seg of SEGMENTS) {
    const angle = seg.angle * TAU - Math.PI / 2; // start at 12 o'clock
    segPositions[seg.id] = {
      ...seg,
      x: cx + ringRadius * Math.cos(angle),
      y: cy + ringRadius * Math.sin(angle),
      angle,
    };
  }

  // Group companies by segment to compute per-cluster offsets
  const grouped = {};
  for (const c of COMPANIES) {
    if (!grouped[c.segment]) grouped[c.segment] = [];
    grouped[c.segment].push(c);
  }

  const nodes = {};
  for (const segId of Object.keys(grouped)) {
    const segPos = segPositions[segId];
    const companies = grouped[segId];
    // sort by stage so prominent / public companies sit nearer the center of the cluster
    const stageOrder = { public: 0, late_private: 1, prime: 1, growth: 2, early: 3, seed: 4 };
    companies.sort((a, b) => (stageOrder[a.stage] ?? 5) - (stageOrder[b.stage] ?? 5));
    companies.forEach((c, i) => {
      const { dx, dy } = sunflower(i, Math.max(companies.length, 4), clusterRadius);
      nodes[c.id] = {
        id: c.id,
        name: c.name,
        ticker: c.ticker,
        segment: c.segment,
        stage: c.stage,
        x: segPos.x + dx,
        y: segPos.y + dy,
      };
    });
  }

  return { cx, cy, ringRadius, clusterRadius, segPositions, nodes };
}

// Used to draw a soft curved arc between two nodes that hugs the center.
export function curvedPath(a, b, cx, cy) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // bend control point towards the global center, scaled by distance
  const dx = mx - cx;
  const dy = my - cy;
  const t = 0.35; // bend amount
  const cxp = mx - dx * t;
  const cyp = my - dy * t;
  // a little perpendicular jitter for visual interest (deterministic)
  const seed = (a.x * 13 + b.y * 7) | 0;
  const jitter = ((seed % 30) - 15);
  const px = -(b.y - a.y);
  const py = (b.x - a.x);
  const pl = Math.hypot(px, py) || 1;
  const jx = (px / pl) * jitter;
  const jy = (py / pl) * jitter;
  return `M ${a.x} ${a.y} Q ${cxp + jx} ${cyp + jy} ${b.x} ${b.y}`;
}
