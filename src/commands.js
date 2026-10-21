// Player commands: translating clicks, drags and hotkeys into orders.
import { S } from './state.js';
import { PLAYER, ENEMY, BUILDING_DEFS, UNIT_DEFS } from './constants.js';
import { byId, buildingName, members, formation, assignLine, commandable } from './world.js';
import { newGame, train, placeSite, transferUnit, applyGroupOrder, issueOutpostOrder, dispatchCarrier, recallCarrier } from './sim.js';
import { say } from './toast.js';

const $ = id => document.getElementById(id);
export const overlayOpen = () => !$('cover').hidden || !$('help').hidden || !$('pause').hidden || !$('over').hidden;

export function entityAt(x, y) {
  for (const u of S.units) if (Math.hypot(u.x - x, u.y - y) <= u.r + 3) return u;
  for (const b of S.buildings) if (Math.abs(b.x - x) <= b.w / 2 && Math.abs(b.y - y) <= b.h / 2) return b;
  for (const m of S.mines) if (Math.hypot(m.x - x, m.y - y) <= m.r + 3) return m;
  return null;
}

export function marker(m) { S.markers.push({ ...m, t: S.t }); }

export function sendOutpostOrder(b, order) {
  if (S.mode === 'courier') return issueOutpostOrder(PLAYER, b, order);
  const n = members(b).length;
  if (!n) { say(`${buildingName(b)} has no troops. Press S to train soldiers there.`, 'bad'); return false; }
  applyGroupOrder(b, order);
  say(`${buildingName(b)}: ${n} troop${n > 1 ? 's' : ''} ${order.type === 'line' ? 'forming a line' : order.type === 'move' ? 'attack-moving' : order.type === 'return' ? 'recalled' : 'transferring'}.`);
  return true;
}

export const selectedTroops = () => S.selected.filter(e => e.kind === 'unit' && e.type !== 'carrier');
export const selectedOutposts = () => S.selected.filter(e => e.kind === 'building' && e.type === 'barracks' && e.built);

// Right-click (or A then click) on a point or an entity.
export function command(p) {
  const target = entityAt(p.x, p.y);
  const bsel = S.selected.filter(e => e.kind === 'building');
  const units = selectedTroops();
  const ownBuilding = target && target.kind === 'building' && target.team === PLAYER && target.built ? target : null;
  const enemy = target && target.kind !== 'mine' && target.team === ENEMY ? target : null;

  for (const b of bsel) {
    if (b.type === 'hq') {
      if (!target || target.kind === 'mine') { b.rally = { x: p.x, y: p.y }; marker({ x: p.x, y: p.y, kind: 'rally' }); say('HQ rally point set. New units will walk there.'); }
      continue;
    }
    if (!b.built) continue;
    const order = ownBuilding ? (ownBuilding.id === b.id ? { type: 'return' } : { type: 'transfer', to: ownBuilding.id })
                : enemy ? { type: 'move', x: enemy.x, y: enemy.y } : { type: 'move', x: p.x, y: p.y };
    if (sendOutpostOrder(b, order) && order.type === 'move') marker({ x: order.x, y: order.y, kind: enemy ? 'attack' : 'move' });
  }
  if (!units.length) return;
  units.forEach((u, i) => {
    u.engage = null; u.timer = 0;
    if (target && target.kind === 'mine' && u.type === 'worker') { u.order = { type: 'gather', mine: target }; return; }
    if (enemy) { u.order = { type: 'attack', target: enemy }; return; }
    if (target && target.kind === 'building' && target.team === PLAYER && !target.built && u.type === 'worker') { u.order = { type: 'build', site: target }; return; }
    if (ownBuilding && u.type !== 'worker') { transferUnit(u, ownBuilding, i, units.length); return; }
    u.order = { type: 'move', ...formation(p.x, p.y, i, units.length, u.r) };
  });
  if (enemy) marker({ x: enemy.x, y: enemy.y, kind: 'attack' });
  else if (target && target.kind === 'mine') marker({ x: target.x, y: target.y, kind: 'rally' });
  else if (ownBuilding && units.some(u => u.type !== 'worker')) say(`Troops stationed at ${buildingName(ownBuilding)}.`);
  else if (!ownBuilding) marker({ x: p.x, y: p.y, kind: 'move' });
}

// Right-drag: troops spread out along the drawn line.
export function lineCommand(l) {
  const units = selectedTroops();
  const order = { type: 'line', x0: l.x0, y0: l.y0, x1: l.x1, y1: l.y1 };
  let any = false;
  for (const b of selectedOutposts()) if (sendOutpostOrder(b, order)) any = true;
  if (units.length) { assignLine(units, l); any = true; say(`${units.length} unit${units.length > 1 ? 's' : ''} forming a line.`); }
  if (any) marker({ ...order, kind: 'line' });
}

export function selectIdleWorker() {
  const idle = S.units.filter(u => commandable(u) && u.type === 'worker' && u.order.type === 'idle');
  if (!idle.length) { say('No idle workers.'); return; }
  const cur = S.selected.length === 1 ? idle.indexOf(S.selected[0]) : -1;
  S.selected = [idle[(cur + 1) % idle.length]]; S.inspect = null;
}

export function act(a) {
  if (a === 'help') { $('help').hidden = false; return; }
  if (a === 'closeHelp') { $('help').hidden = true; return; }
  if (a === 'menu') { if (S) S.paused = true; $('pause').hidden = true; $('over').hidden = true; $('cover').hidden = false; return; }
  if (a === 'restart') { $('pause').hidden = true; $('over').hidden = true; newGame(); return; }
  if (!S) return;
  if (a === 'pause') { if (S.over) return; S.paused = !S.paused; $('pause').hidden = !S.paused; return; }
  if (a === 'speed') { S.speed = S.speed === 1 ? 2 : 1; $('speedBtn').textContent = S.speed + 'x'; return; }
  if (S.over || S.paused) return;
  if (a === 'dispatch') { dispatchCarrier(PLAYER); return; }
  if (a === 'recallCourier') { recallCarrier(PLAYER); return; }
  if (a === 'idle') { selectIdleWorker(); return; }
  const units = selectedTroops();
  if (a === 'build') {
    if (!units.some(u => u.type === 'worker')) { say('Select a worker first (click one, or press Tab).', 'bad'); return; }
    if (S.gold[PLAYER] < BUILDING_DEFS.barracks.cost) say(`Not enough gold. An outpost costs ${BUILDING_DEFS.barracks.cost}, you have ${S.gold[PLAYER]}.`, 'bad');
    else { S.placing = 'barracks'; S.targeting = null; }
    return;
  }
  if (a === 'attack') { if (units.length || selectedOutposts().length) { S.targeting = 'attack'; S.placing = null; } else say('Select units or an outpost first.', 'bad'); return; }
  if (a === 'hold') { for (const u of units) { u.order = { type: 'idle' }; u.engage = null; u.post = { x: u.x, y: u.y }; } if (units.length) say('Holding position.'); return; }
  if (a === 'recall') { for (const b of selectedOutposts()) sendOutpostOrder(b, { type: 'return' }); return; }
  const wanted = a === 'soldier' ? 'barracks' : 'hq';
  const b = S.selected.find(e => e.kind === 'building' && e.built && e.type === wanted);
  if (b) train(b, a);
  else say(wanted === 'hq' ? 'Select the HQ first to train that.' : 'Select a finished outpost first. Soldiers are trained at outposts.', 'bad');
}
