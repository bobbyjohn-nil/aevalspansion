// Geometry, lookups and territory. Pure functions over S; nothing here advances time.
import { S } from './state.js';
import { W, H, CELL, GW, GH, PLAYER, UNIT_DEFS, BUILDING_DEFS, CHAIN_RANGE, LINE_SPACING, CARRY } from './constants.js';

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function edgeDist(x, y, e) {
  if (e.kind === 'building') {
    const dx = Math.max(Math.abs(x - e.x) - e.w / 2, 0), dy = Math.max(Math.abs(y - e.y) - e.h / 2, 0);
    return Math.hypot(dx, dy);
  }
  return Math.hypot(e.x - x, e.y - y) - e.r;
}
export const inCircle = (e, cx, cy, r) => Math.hypot(e.x - cx, e.y - cy) <= r;

export function blockedBy(x, y, r, ignore) {
  for (const b of S.buildings)
    if (b !== ignore && b.hp > 0 && Math.abs(x - b.x) < b.w / 2 + r && Math.abs(y - b.y) < b.h / 2 + r) return b;
  return null;
}

// Step toward a point, steering around any building in the way (except `ignore`, the one we're heading into).
export function moveToward(u, x, y, step, ignore) {
  const dx = x - u.x, dy = y - u.y, dist = Math.hypot(dx, dy);
  if (dist <= step) { u.x = x; u.y = y; return true; }
  const r = u.r - 0.5, ux = dx / dist, uy = dy / dist;
  const b = blockedBy(u.x + ux * step, u.y + uy * step, r, ignore);
  if (!b) { u.x += ux * step; u.y += uy * step; return false; }
  const sign = ux * (u.y - b.y) - uy * (u.x - b.x) >= 0 ? 1 : -1;
  for (const deg of [30, 60, 90, 120, 150]) for (const s of [sign, -sign]) {
    const a = s * deg * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    const vx = c * ux - sn * uy, vy = sn * ux + c * uy;
    if (!blockedBy(u.x + vx * step, u.y + vy * step, r, ignore)) { u.x += vx * step; u.y += vy * step; return false; }
  }
  return false;
}

export function approach(u, e, step, within) {
  if (edgeDist(u.x, u.y, e) <= within) return true;
  moveToward(u, e.x, e.y, step, e.kind === 'building' ? e : null);
  return false;
}

export function returnToPost(u) {
  if (u.post && Math.hypot(u.post.x - u.x, u.post.y - u.y) > 12) u.order = { type: 'move', x: u.post.x, y: u.post.y };
}

export function nearest(list, x, y, filter) {
  let best = null, bd = Infinity;
  for (const e of list) {
    if (filter && !filter(e)) continue;
    const d = edgeDist(x, y, e);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
export const byId = id => S.buildings.find(b => b.id === id) || S.units.find(u => u.id === id) || null;
export const findHQ = team => S.buildings.find(b => b.team === team && b.type === 'hq' && b.hp > 0) || null;
export const ownOutposts = team => S.buildings.filter(b => b.team === team && b.type === 'barracks' && b.built && b.hp > 0);
export const buildingName = b => (b.team === PLAYER ? '' : 'Red ') + (b.type === 'hq' ? 'HQ' : `Outpost ${b.num}`);
export const canMine = (m, team) => m.gold > 0 && owner(m.x, m.y) === team;
export const nearestOwnedMine = (team, x, y) => nearest(S.mines, x, y, m => canMine(m, team));
export const members = b => S.units.filter(u => u.group === b.id && u.hp > 0 && u.type !== 'carrier' && u.type !== 'worker');
export const inHQSight = e => { const hq = findHQ(PLAYER); return !!hq && inCircle(e, hq.x, hq.y, BUILDING_DEFS.hq.sight); };
export const commandable = u => u.team === PLAYER && u.hp > 0 && u.type !== 'carrier' && (S.mode === 'direct' || inHQSight(u));

export function formation(x, y, i, n, r) {
  const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
  return { x: clamp(x + (i % cols - (cols - 1) / 2) * 22, r, W - r), y: clamp(y + (Math.floor(i / cols) - (rows - 1) / 2) * 22, r, H - r) };
}
export const rallyPoint = b => b.rally || { x: b.x + (b.team === PLAYER ? 1 : -1) * (b.w / 2 + 40), y: b.y };

// Evenly spaced slots along a drawn line. A short line is stretched about its midpoint so units never overlap.
export function lineSlots(l, n) {
  let { x0, y0, x1, y1 } = l;
  let len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
  const minLen = (n - 1) * LINE_SPACING;
  if (len < minLen) { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; x0 = mx - ux * minLen / 2; y0 = my - uy * minLen / 2; len = minLen; }
  const slots = [];
  for (let i = 0; i < n; i++) { const k = n === 1 ? 0.5 : i / (n - 1); slots.push({ x: clamp(x0 + ux * len * k, 10, W - 10), y: clamp(y0 + uy * len * k, 10, H - 10) }); }
  return slots;
}
// Units sorted by their position along the line take slots in order, so they do not cross paths.
export function assignLine(units, l) {
  const ux = l.x1 - l.x0, uy = l.y1 - l.y0;
  const sorted = [...units].sort((a, b) => (a.x * ux + a.y * uy) - (b.x * ux + b.y * uy));
  const slots = lineSlots(l, sorted.length);
  sorted.forEach((u, i) => { u.engage = null; u.timer = 0; u.order = { type: 'move', x: slots[i].x, y: slots[i].y }; });
}

export function nearestEnemy(u, range) {
  let best = null, bd = Infinity;
  for (const e of [...S.units, ...S.buildings]) {
    if (e.team === u.team || e.hp <= 0) continue;
    const d = edgeDist(u.x, u.y, e);
    if (d > range) continue;
    const score = d + (e.kind === 'building' ? 40 : 0);
    if (score < bd) { bd = score; best = e; }
  }
  return best;
}

export function computeTerritory() {
  const inf = S.inf;
  inf[0].fill(0); inf[1].fill(0);
  const add = (team, x, y, r) => {
    if (r <= 0) return;
    const a = inf[team];
    const x0 = Math.max(0, Math.floor((x - r) / CELL)), x1 = Math.min(GW - 1, Math.floor((x + r) / CELL));
    const y0 = Math.max(0, Math.floor((y - r) / CELL)), y1 = Math.min(GH - 1, Math.floor((y + r) / CELL));
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const v = 1 - Math.hypot(gx * CELL + CELL / 2 - x, gy * CELL + CELL / 2 - y) / r;
      if (v > 0) { const i = gy * GW + gx; if (v > a[i]) a[i] = v; }
    }
  };
  for (const b of S.buildings) { const d = BUILDING_DEFS[b.type]; add(b.team, b.x, b.y, b.built ? d.terr : d.siteTerr); }
  for (const u of S.units) add(u.team, u.x, u.y, UNIT_DEFS[u.type].terr);
  for (let i = 0; i < GW * GH; i++) S.terr[i] = inf[0][i] > inf[1][i] ? 0 : inf[1][i] > inf[0][i] ? 1 : -1;
}
export function owner(x, y) {
  return S.terr[clamp(Math.floor(y / CELL), 0, GH - 1) * GW + clamp(Math.floor(x / CELL), 0, GW - 1)];
}
export function territoryShare(team) {
  let n = 0;
  for (let i = 0; i < GW * GH; i++) if (S.terr[i] === team) n++;
  return n / (GW * GH);
}

export function placeFail(type, x, y, team) {
  const d = BUILDING_DEFS[type];
  if (x - d.w / 2 < 10 || y - d.h / 2 < 10 || x + d.w / 2 > W - 10 || y + d.h / 2 > H - 10) return 'Too close to the map edge';
  for (const b of S.buildings)
    if (Math.abs(b.x - x) < (b.w + d.w) / 2 + 10 && Math.abs(b.y - y) < (b.h + d.h) / 2 + 10) return 'Overlaps a building';
  for (const m of S.mines)
    if (Math.abs(m.x - x) < d.w / 2 + m.r + 10 && Math.abs(m.y - y) < d.h / 2 + m.r + 10) return 'Overlaps a gold mine';
  if (owner(x, y) !== team) return 'Must be inside your territory (your colour)';
  if (type === 'barracks' && !S.buildings.some(b => b.team === team && Math.hypot(b.x - x, b.y - y) <= CHAIN_RANGE))
    return 'Must be inside a dashed ring (near your HQ or another outpost)';
  return null;
}

export function describeOrder(o) {
  if (!o) return 'none';
  if (o.type === 'move') return 'attack-move to the marked point';
  if (o.type === 'line') return 'form a line at the marked position';
  if (o.type === 'return') return 'recalled to the outpost';
  const d = byId(o.to);
  return `transfer to ${d ? buildingName(d) : '?'}`;
}

export const unitState = u => u.engage ? `Fighting ${u.engage.kind === 'building' ? buildingName(u.engage) : UNIT_DEFS[u.engage.type].name}`
  : u.order.type === 'gather' ? (u.carry >= CARRY ? 'Returning gold' : 'Mining') : u.order.type === 'build' ? 'Building' : u.order.type === 'attack' ? 'Attacking' : u.order.type === 'move' ? 'Moving' : 'Idle';
