// Canvas drawing. Reads S, never changes it.
import { S } from './state.js';
import { W, H, CELL, GW, GH, PLAYER, TEAM_COLOR, TEAM_RGB, UNIT_DEFS, BUILDING_DEFS, CHAIN_RANGE, LINE_MIN_DRAG } from './constants.js';
import { byId, findHQ, owner, placeFail, members, lineSlots, clamp } from './world.js';
import { selectedTroops, selectedOutposts } from './commands.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const terrCanvas = document.createElement('canvas');
terrCanvas.width = GW; terrCanvas.height = GH;
const terrCtx = terrCanvas.getContext('2d');
const terrImg = terrCtx.createImageData(GW, GH);

function bar(cx, y, w, frac, fg, bg) {
  ctx.fillStyle = bg; ctx.fillRect(cx - w / 2, y, w, 4);
  ctx.fillStyle = fg; ctx.fillRect(cx - w / 2, y, w * clamp(frac, 0, 1), 4);
}

function drawTerritory() {
  const px = terrImg.data;
  for (let i = 0; i < GW * GH; i++) {
    const t = S.terr[i], o = i * 4;
    if (t < 0) { px[o + 3] = 0; continue; }
    px[o] = TEAM_RGB[t][0]; px[o + 1] = TEAM_RGB[t][1]; px[o + 2] = TEAM_RGB[t][2]; px[o + 3] = 70;
  }
  terrCtx.putImageData(terrImg, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(terrCanvas, 0, 0, W, H);
  const paths = [new Path2D(), new Path2D(), new Path2D()];
  const seg = (a, b, x0, y0, x1, y1) => {
    const p = a >= 0 && b >= 0 ? paths[2] : paths[a >= 0 ? a : b];
    p.moveTo(x0, y0); p.lineTo(x1, y1);
  };
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const i = gy * GW + gx, a = S.terr[i];
    if (gx < GW - 1 && S.terr[i + 1] !== a) seg(a, S.terr[i + 1], (gx + 1) * CELL, gy * CELL, (gx + 1) * CELL, (gy + 1) * CELL);
    if (gy < GH - 1 && S.terr[i + GW] !== a) seg(a, S.terr[i + GW], gx * CELL, (gy + 1) * CELL, (gx + 1) * CELL, (gy + 1) * CELL);
  }
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(74,158,255,0.7)'; ctx.stroke(paths[0]);
  ctx.strokeStyle = 'rgba(255,90,90,0.7)'; ctx.stroke(paths[1]);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke(paths[2]);
}

function drawBuilding(b) {
  const sel = S.selected.includes(b), hov = S.hover === b || S.inspect === b;
  ctx.globalAlpha = b.built ? 1 : 0.6;
  ctx.fillStyle = TEAM_COLOR[b.team];
  ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = sel ? '#fff' : hov ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'; ctx.lineWidth = sel ? 2.5 : hov ? 2 : 1;
  ctx.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Chakra Petch, system-ui'; ctx.textBaseline = 'middle';
  ctx.fillText(b.team === PLAYER ? (b.type === 'hq' ? 'HQ' : `Outpost ${b.num}`) : (b.type === 'hq' ? 'RED HQ' : `Red post ${b.num}`), b.x, b.y);
  ctx.textBaseline = 'alphabetic';
  if (b.hp < b.maxHp || sel || hov) bar(b.x, b.y - b.h / 2 - 8, b.w, b.hp / b.maxHp, '#4c4', '#c33');
  if (!b.built) bar(b.x, b.y + b.h / 2 + 4, b.w, b.progress, '#ddd', '#444');
  else if (b.queue.length) {
    bar(b.x, b.y + b.h / 2 + 4, b.w, b.qTime / UNIT_DEFS[b.queue[0]].time, '#ddd', '#444');
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '10px IBM Plex Sans, system-ui';
    ctx.fillText(`${UNIT_DEFS[b.queue[0]].name}${b.queue.length > 1 ? ' x' + b.queue.length : ''}`, b.x, b.y + b.h / 2 + 18);
  }
  if (b.team === PLAYER && b.rally && (sel || b.type === 'hq')) {
    ctx.strokeStyle = 'rgba(242,193,78,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(b.rally.x, b.rally.y); ctx.lineTo(b.rally.x, b.rally.y - 16); ctx.stroke();
    ctx.fillStyle = 'rgba(242,193,78,0.9)';
    ctx.beginPath(); ctx.moveTo(b.rally.x, b.rally.y - 16); ctx.lineTo(b.rally.x + 10, b.rally.y - 12); ctx.lineTo(b.rally.x, b.rally.y - 8); ctx.closePath(); ctx.fill();
  }
}

function unitPath(u) {
  ctx.beginPath();
  if (u.type === 'soldier') {
    ctx.moveTo(u.x, u.y - u.r - 1); ctx.lineTo(u.x + u.r + 1, u.y + u.r - 1); ctx.lineTo(u.x - u.r - 1, u.y + u.r - 1); ctx.closePath();
  } else if (u.type === 'commander') {
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; ctx.lineTo(u.x + Math.cos(a) * (u.r + 2), u.y + Math.sin(a) * (u.r + 2)); }
    ctx.closePath();
  } else if (u.type === 'carrier') {
    ctx.moveTo(u.x, u.y - 8); ctx.lineTo(u.x + 5, u.y); ctx.lineTo(u.x, u.y + 8); ctx.lineTo(u.x - 5, u.y); ctx.closePath();
  } else {
    ctx.arc(u.x, u.y, u.r, 0, Math.PI * 2);
  }
}

function drawUnit(u) {
  const sel = S.selected.includes(u), hov = S.hover === u || S.inspect === u;
  if (sel || hov) { ctx.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(u.x, u.y, u.r + 4, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = u.type === 'carrier' ? '#fff' : TEAM_COLOR[u.team];
  unitPath(u);
  ctx.fill();
  ctx.strokeStyle = u.type === 'carrier' ? TEAM_COLOR[u.team] : 'rgba(0,0,0,0.6)'; ctx.lineWidth = u.type === 'carrier' ? 2 : 1; ctx.stroke();
  if (u.carry > 0) { ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(u.x, u.y, 3, 0, Math.PI * 2); ctx.fill(); }
  if (u.hp < u.maxHp || sel) bar(u.x, u.y - u.r - 8, 20, u.hp / u.maxHp, '#4c4', '#c33');
  if (u.team === PLAYER && u.type === 'worker' && u.order.type === 'idle' && !u.carry) {
    ctx.fillStyle = 'rgba(242,193,78,0.95)'; ctx.font = 'bold 10px Chakra Petch, system-ui'; ctx.fillText('idle', u.x, u.y - u.r - 10);
  }
  if (u.type === 'carrier' && u.manifest && Object.keys(u.manifest).length) { ctx.fillStyle = TEAM_COLOR[u.team]; ctx.beginPath(); ctx.arc(u.x, u.y, 2.5, 0, Math.PI * 2); ctx.fill(); }
  if (u.hit && S.t < u.hit.until) {
    ctx.strokeStyle = u.team === PLAYER ? 'rgba(200,230,255,0.95)' : 'rgba(255,220,200,0.95)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(u.hit.x, u.hit.y); ctx.stroke();
  }
}

function drawOrderLine(from, o, style, dash) {
  let tx, ty;
  if (o.type === 'move') { tx = o.x; ty = o.y; }
  else if (o.type === 'line') { tx = (o.x0 + o.x1) / 2; ty = (o.y0 + o.y1) / 2; }
  else if (o.type === 'attack' && o.target) { tx = o.target.x; ty = o.target.y; }
  else if (o.type === 'gather' && o.mine) { tx = o.mine.x; ty = o.mine.y; }
  else if (o.type === 'build' && o.site) { tx = o.site.x; ty = o.site.y; }
  else if (o.type === 'transfer') { const d = byId(o.to); if (!d) return; tx = d.x; ty = d.y; }
  else return;
  ctx.setLineDash(dash); ctx.strokeStyle = style; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(tx, ty); ctx.stroke();
  if (o.type === 'line') { ctx.beginPath(); ctx.moveTo(o.x0, o.y0); ctx.lineTo(o.x1, o.y1); ctx.stroke(); }
  ctx.setLineDash([]);
  if (o.type === 'move') { ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.stroke(); }
}

function circle(x, y, r, style, dash) {
  ctx.setLineDash(dash || []); ctx.strokeStyle = style; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
}

function drawGrid() {
  ctx.fillStyle = '#26332a'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 50) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
}

// Line preview while right-dragging: the slots the selected troops will take.
function drawLinePreview() {
  const d = S.rdrag;
  if (!d || Math.hypot(d.x1 - d.x0, d.y1 - d.y0) < LINE_MIN_DRAG) return;
  let n = selectedTroops().length;
  for (const b of selectedOutposts()) n += members(b).length;
  if (!n) return;
  ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(124,255,156,0.9)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(d.x0, d.y0); ctx.lineTo(d.x1, d.y1); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(124,255,156,0.8)';
  for (const s of lineSlots(d, n)) { ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill(); }
}

function drawCourier(c, hq) {
  // Route ahead: remaining stops, then home.
  if (c.stage !== 'hq') {
    const pts = c.stage === 'out' ? c.route.slice(c.stop).map(id => byId(id)).filter(Boolean) : [];
    if (hq) pts.push(hq);
    ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(c.x, c.y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.stroke(); ctx.setLineDash([]);
  }
  for (const id in c.manifest) { const b = byId(+id); if (b) drawOrderLine(b, c.manifest[id], 'rgba(255,255,255,0.9)', [6, 6]); }
}

export function draw() {
  drawGrid();
  if (!S) return;
  drawTerritory();
  const hq = findHQ(PLAYER), tm = S.teams[PLAYER], c = tm.carrier;
  if (S.mode === 'courier' && hq) circle(hq.x, hq.y, BUILDING_DEFS.hq.sight, 'rgba(255,255,255,0.3)', [4, 8]);

  ctx.textAlign = 'center';
  for (const m of S.mines) {
    const o = owner(m.x, m.y);
    ctx.fillStyle = m.gold > 0 ? (o === PLAYER ? '#e8b733' : o === 1 ? '#b08a3a' : '#9c8e60') : '#555';
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - m.r); ctx.lineTo(m.x + m.r, m.y); ctx.lineTo(m.x, m.y + m.r); ctx.lineTo(m.x - m.r, m.y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = o >= 0 ? TEAM_COLOR[o] : 'rgba(255,255,255,0.5)'; ctx.lineWidth = o >= 0 ? 2.5 : 1; ctx.setLineDash(o >= 0 ? [] : [3, 3]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.font = '11px IBM Plex Sans, system-ui';
    ctx.fillText(m.gold > 0 ? m.gold : 'empty', m.x, m.y + m.r + 12);
    if (o < 0 && m.gold > 0) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '9px IBM Plex Sans, system-ui'; ctx.fillText('neutral', m.x, m.y - m.r - 5); }
  }

  if (S.placing) {
    const d = BUILDING_DEFS[S.placing];
    for (const b of S.buildings) if (b.team === PLAYER) circle(b.x, b.y, CHAIN_RANGE, 'rgba(255,255,255,0.35)', [3, 5]);
    const ok = !placeFail(S.placing, S.mouse.x, S.mouse.y, PLAYER) && S.gold[PLAYER] >= d.cost;
    ctx.fillStyle = ok ? 'rgba(90,209,122,0.5)' : 'rgba(255,80,80,0.45)';
    ctx.fillRect(S.mouse.x - d.w / 2, S.mouse.y - d.h / 2, d.w, d.h);
    circle(S.mouse.x, S.mouse.y, d.terr, ok ? 'rgba(90,209,122,0.6)' : 'rgba(255,80,80,0.5)');
  }

  for (const u of S.selected) if (u.kind === 'unit' && u.type !== 'carrier') {
    if (u.engage) drawOrderLine(u, { type: 'attack', target: u.engage }, 'rgba(255,120,120,0.8)', [2, 3]);
    else drawOrderLine(u, u.order, u.order.type === 'attack' ? 'rgba(255,120,120,0.8)' : u.order.type === 'gather' ? 'rgba(242,193,78,0.7)' : 'rgba(255,255,255,0.55)', [4, 4]);
  }
  for (const b of S.selected) if (b.kind === 'building' && b.type === 'barracks' && b.built) {
    for (const u of members(b)) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(u.x, u.y); ctx.stroke(); }
    if (b.order) drawOrderLine(b, b.order, 'rgba(255,255,255,0.35)', [2, 6]);
    if (tm.outbox[b.id]) drawOrderLine(b, tm.outbox[b.id], 'rgba(242,193,78,0.6)', [2, 4]);
  }
  if (c) drawCourier(c, hq);

  for (const b of S.buildings) drawBuilding(b);
  for (const u of S.units) drawUnit(u);

  for (const m of S.markers) {
    if (m.kind === 'line') {
      const k = (S.t - m.t) / 1.2;
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#7cff9c'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(m.x0, m.y0); ctx.lineTo(m.x1, m.y1); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1; continue;
    }
    const k = (S.t - m.t) / 0.8;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = m.kind === 'attack' ? '#ff6b6b' : m.kind === 'rally' ? '#f2c14e' : '#7cff9c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(m.x, m.y, 6 + 14 * k, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawLinePreview();
  if (S.drag) {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(S.drag.x0, S.drag.y0, S.drag.x1 - S.drag.x0, S.drag.y1 - S.drag.y0);
    ctx.strokeRect(S.drag.x0, S.drag.y0, S.drag.x1 - S.drag.x0, S.drag.y1 - S.drag.y0);
  }
  if (S.over) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, W, H); }
}
