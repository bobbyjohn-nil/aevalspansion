// Mouse and keyboard wiring. Left = select, right = command, right-drag = line formation.
import { S, settings, saveSettings } from './state.js';
import { W, H, PLAYER, LINE_MIN_DRAG } from './constants.js';
import { commandable } from './world.js';
import { newGame, placeSite } from './sim.js';
import { act, command, lineCommand, entityAt, selectIdleWorker, overlayOpen, selectedTroops, selectedOutposts } from './commands.js';
import { refreshCover } from './ui.js';
import { say } from './toast.js';

const $ = id => document.getElementById(id);
const canvas = $('game');

export function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  const s = Math.min(r.width / W, r.height / H);
  return { x: (e.clientX - r.left - (r.width - W * s) / 2) / s, y: (e.clientY - r.top - (r.height - H * s) / 2) / s };
}

const dragLen = d => Math.hypot(d.x1 - d.x0, d.y1 - d.y0);
const canLine = () => selectedTroops().length > 0 || selectedOutposts().length > 0;

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousedown', e => {
  if (!S || S.over || overlayOpen()) return;
  const p = toWorld(e);
  if (e.button === 0) {
    if (S.placing) {
      const builders = S.selected.filter(u => u.kind === 'unit' && u.type === 'worker');
      if (placeSite(PLAYER, S.placing, p.x, p.y, builders)) S.placing = null;
      return;
    }
    if (S.targeting) { S.rdrag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, button: 0 }; return; }
    S.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, shift: e.shiftKey };
  } else if (e.button === 2) {
    if (S.placing || S.targeting) { S.placing = null; S.targeting = null; return; }
    if (canLine()) S.rdrag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, button: 2 };
    else command(p);
  }
});
canvas.addEventListener('mousemove', e => {
  if (!S) return;
  S.mouse = toWorld(e);
  S.mouseClient = { x: e.clientX, y: e.clientY };
  if (S.drag) { S.drag.x1 = S.mouse.x; S.drag.y1 = S.mouse.y; }
  if (S.rdrag) { S.rdrag.x1 = S.mouse.x; S.rdrag.y1 = S.mouse.y; }
});
canvas.addEventListener('mouseleave', () => { if (S) { S.mouse = { x: -100, y: -100 }; S.hover = null; } });
window.addEventListener('mouseup', e => {
  if (!S) return;
  if (S.rdrag && e.button === S.rdrag.button) {
    const d = S.rdrag; S.rdrag = null;
    if (dragLen(d) >= LINE_MIN_DRAG) lineCommand(d); else command({ x: d.x0, y: d.y0 });
    S.targeting = null;
    return;
  }
  if (e.button !== 0 || !S.drag) return;
  const d = S.drag; S.drag = null;
  const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
  if (x1 - x0 < 6 && y1 - y0 < 6) {
    const hit = entityAt(d.x0, d.y0);
    const now = performance.now();
    const dbl = hit && S.lastClick.id === hit.id && now - S.lastClick.at < 350;
    S.lastClick = { id: hit ? hit.id : null, at: now };
    if (hit && hit.kind === 'unit' && commandable(hit)) {
      if (dbl) S.selected = S.units.filter(u => commandable(u) && u.type === hit.type);
      else if (d.shift) S.selected = S.selected.includes(hit) ? S.selected.filter(e => e !== hit) : [...S.selected.filter(e => e.kind === 'unit'), hit];
      else S.selected = [hit];
      S.inspect = null;
    } else if (hit && hit.team === PLAYER && (hit.kind === 'building' || hit.type === 'carrier')) { S.selected = [hit]; S.inspect = null; }
    else if (hit && (hit.kind === 'mine' || hit.team !== PLAYER)) { S.selected = []; S.inspect = hit; }
    else { S.selected = []; S.inspect = null; }
  } else {
    const box = S.units.filter(u => commandable(u) && u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1);
    S.selected = d.shift ? [...new Set([...S.selected.filter(e => e.kind === 'unit'), ...box])] : box;
    S.inspect = null;
  }
});
window.addEventListener('keydown', e => {
  const k = e.key;
  if (k === 'F1' || (k === '?' && !overlayOpen())) { e.preventDefault(); $('help').hidden = !$('help').hidden; return; }
  if (!$('help').hidden) { if (k === 'Escape') $('help').hidden = true; return; }
  if (!S || !$('cover').hidden || !$('over').hidden) return;
  if (k === 'p' || k === 'P' || (k === 'Escape' && S.paused)) { act('pause'); return; }
  if (S.paused) return;
  if (k === 'Escape') { if (S.placing || S.targeting || S.rdrag) { S.placing = null; S.targeting = null; S.rdrag = null; } else { S.selected = []; S.inspect = null; } return; }
  if (k === 'Tab') { e.preventDefault(); selectIdleWorker(); return; }
  if (/^[1-5]$/.test(k)) {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); S.groups[k] = selectedTroops().map(u => u.id); say(`Control group ${k} set (${S.groups[k].length} units).`); }
    else { const ids = S.groups[k] || []; const us = S.units.filter(u => ids.includes(u.id) && commandable(u)); if (us.length) { S.selected = us; S.inspect = null; } }
    return;
  }
  const map = { b: 'build', w: 'worker', c: 'commander', s: 'soldier', d: 'dispatch', a: 'attack', h: 'hold', r: 'recall', t: 'speed' };
  const a = map[k.toLowerCase()];
  if (a && !e.ctrlKey && !e.metaKey) act(a);
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el) act(el.dataset.act);
});

// Cover screen
$('segDiff').addEventListener('click', e => { if (e.target.dataset.v) { settings.diff = e.target.dataset.v; saveSettings(); refreshCover(); } });
$('segMode').addEventListener('click', e => { if (e.target.dataset.v) { settings.mode = e.target.dataset.v; saveSettings(); refreshCover(); } });
$('playBtn').addEventListener('click', () => { $('cover').hidden = true; newGame(); });
