// The simulation: units, buildings, courier, enemy AI and the per-tick update.
// Everything here is driven by plain data orders, so a server could run it unchanged later.
import { S, setS, settings } from './state.js';
import { W, H, GW, GH, PLAYER, ENEMY, UNIT_DEFS, BUILDING_DEFS, DIFF, MINE_R, GATHER_TIME, CARRY, MAX_QUEUE,
         CARRIER_DWELL, CARRIER_GRACE, CARRIER_RESPAWN } from './constants.js';
import { approach, moveToward, returnToPost, nearest, byId, findHQ, buildingName, canMine, nearestOwnedMine, members,
         formation, rallyPoint, assignLine, nearestEnemy, computeTerritory, owner, placeFail, describeOrder, clamp, edgeDist } from './world.js';
import { say, clearToasts } from './toast.js';

export const hooks = { onOver: null };

function newTeam() { return { carrier: null, carrierTimer: 0, outpostCount: 0, hist: [], built: 0, outbox: {} }; }

export function newGame() {
  setS({
    t: 0, nextId: 1, gold: [150, DIFF[settings.diff].aiGold], mode: settings.mode, diff: settings.diff,
    units: [], buildings: [], mines: [],
    teams: [newTeam(), newTeam()],
    terr: new Int8Array(GW * GH), inf: [new Float32Array(GW * GH), new Float32Array(GW * GH)],
    selected: [], inspect: null, placing: null, targeting: null, drag: null, rdrag: null, mouse: { x: -100, y: -100 }, mouseClient: null, hover: null,
    over: null, paused: false, speed: 1, kills: [0, 0], markers: [], groups: {}, panelSig: null, lastClick: { id: null, at: 0 },
  });
  const hqs = [addBuilding(PLAYER, 'hq', 120, H / 2, true), addBuilding(ENEMY, 'hq', W - 120, H / 2, true)];
  const mine = (x, y, gold) => S.mines.push({ id: S.nextId++, kind: 'mine', x, y, r: MINE_R, gold, max: gold });
  mine(140, 150, 1500); mine(140, H - 150, 1500);
  mine(W - 140, 150, 1500); mine(W - 140, H - 150, 1500);
  mine(W / 2, 120, 2500); mine(W / 2, H - 120, 2500);
  computeTerritory();
  for (const team of [PLAYER, ENEMY]) {
    const x = team === PLAYER ? 190 : W - 190;
    for (let i = 0; i < 3; i++) {
      const u = addUnit(team, 'worker', x, H / 2 - 30 + i * 30, hqs[team].id);
      const m = nearestOwnedMine(team, u.x, u.y);
      if (m) u.order = { type: 'gather', mine: m };
    }
    if (S.mode === 'courier') spawnCarrier(team);
  }
  clearToasts();
  say('Select a worker and press B to build your first outpost.', 'good');
}

export function addUnit(team, type, x, y, group) {
  const d = UNIT_DEFS[type];
  const u = { id: S.nextId++, kind: 'unit', team, type, x, y, r: d.r, hp: d.hp, maxHp: d.hp, group,
              order: { type: 'idle' }, engage: null, carry: 0, timer: 0, cd: 0, hit: null, idle: 0, post: { x, y } };
  S.units.push(u);
  return u;
}

export function addBuilding(team, type, x, y, built) {
  const d = BUILDING_DEFS[type];
  const b = { id: S.nextId++, kind: 'building', team, type, x, y, w: d.w, h: d.h,
              hp: built ? d.hp : 1, maxHp: d.hp, built, progress: built ? 1 : 0, queue: [], qTime: 0, order: null, num: 0, rally: null };
  if (type === 'barracks') b.num = ++S.teams[team].outpostCount;
  S.buildings.push(b);
  return b;
}

// ---------- Units ----------
function updateUnit(u, dt) {
  if (u.type === 'carrier') { updateCarrier(u, dt); return; }
  const d = UNIT_DEFS[u.type];
  u.cd = Math.max(0, u.cd - dt);

  if (d.aggro > 0) {
    if (u.engage && (u.engage.hp <= 0 || edgeDist(u.x, u.y, u.engage) > d.aggro * 1.5)) {
      u.engage = null;
      if (u.order.type === 'idle') returnToPost(u);
    }
    if (!u.engage && (u.order.type === 'idle' || u.order.type === 'move')) u.engage = nearestEnemy(u, d.aggro);
    if (u.engage) { attack(u, u.engage, d, dt); return; }
  }

  const o = u.order;
  if (o.type === 'idle') {
    if (u.type === 'worker') {
      u.idle += dt;
      if (u.idle > 2) { u.idle = 0; const m = nearestOwnedMine(u.team, u.x, u.y); if (m) u.order = { type: 'gather', mine: m }; }
    }
  } else if (o.type === 'move') {
    const before = Math.hypot(o.x - u.x, o.y - u.y);
    if (moveToward(u, o.x, o.y, d.speed * dt)) { u.order = { type: 'idle' }; u.post = { x: u.x, y: u.y }; return; }
    if (o.last !== undefined && o.last - before < d.speed * dt * 0.2) o.stall = (o.stall || 0) + dt; else o.stall = 0;
    o.last = before;
    if (o.stall > 1.5) { u.order = { type: 'idle' }; u.post = { x: u.x, y: u.y }; }
  } else if (o.type === 'attack') {
    if (o.target.hp <= 0) { u.order = { type: 'idle' }; returnToPost(u); } else attack(u, o.target, d, dt);
  } else if (o.type === 'gather') {
    gather(u, o, d, dt);
  } else if (o.type === 'build') {
    build(u, o, d, dt);
  }
}

function attack(u, target, d, dt) {
  if (approach(u, target, d.speed * dt, d.range) && u.cd <= 0) {
    u.cd = d.cd;
    target.hp -= d.dmg;
    u.hit = { x: target.x, y: target.y, until: S.t + 0.12 };
  }
}

function deposit(u) {
  const mult = u.team === ENEMY ? DIFF[S.diff].aiIncome : 1;
  const amt = Math.round(u.carry * mult);
  S.gold[u.team] += amt;
  S.teams[u.team].hist.push({ t: S.t, amt });
  u.carry = 0;
}

function gather(u, o, d, dt) {
  if (u.carry >= CARRY || (u.carry > 0 && !canMine(o.mine, u.team))) {
    const depot = nearest(S.buildings, u.x, u.y, b => b.team === u.team && b.built);
    if (!depot) { u.order = { type: 'idle' }; return; }
    if (approach(u, depot, d.speed * dt, u.r + 4)) deposit(u);
    return;
  }
  if (!canMine(o.mine, u.team)) {
    const m = nearestOwnedMine(u.team, u.x, u.y);
    if (m) o.mine = m;
    else { u.order = { type: 'idle' }; if (u.team === PLAYER) say(o.mine.gold <= 0 ? 'That mine is empty. Claim another one.' : 'No gold mine inside your territory. Push your border out with outposts and troops.', 'bad'); }
    return;
  }
  if (approach(u, o.mine, d.speed * dt, u.r + 4)) {
    u.timer += dt;
    if (u.timer >= GATHER_TIME) {
      u.timer = 0;
      const take = Math.min(CARRY, o.mine.gold);
      o.mine.gold -= take; u.carry += take;
    }
  }
}

function build(u, o, d, dt) {
  const b = o.site;
  if (b.hp <= 0 || b.built) { u.order = { type: 'idle' }; return; }
  if (approach(u, b, d.speed * dt, u.r + 6)) {
    const bt = BUILDING_DEFS[b.type].buildTime;
    b.progress = Math.min(1, b.progress + dt / bt);
    b.hp = Math.min(b.maxHp, b.hp + b.maxHp * dt / bt);
    if (b.progress >= 1) {
      b.built = true; b.hp = b.maxHp; S.teams[b.team].built++;
      if (b.team === PLAYER) say(`${buildingName(b)} finished. Select it and press S to train soldiers.`, 'good');
      const m = nearestOwnedMine(u.team, u.x, u.y);
      u.order = m ? { type: 'gather', mine: m } : { type: 'idle' };
    }
  }
}

function separate() {
  const us = S.units;
  for (let i = 0; i < us.length; i++) {
    for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j], min = a.r + b.r;
      let dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) >= min || Math.abs(dy) >= min) continue;
      let dist = Math.hypot(dx, dy);
      if (dist < 0.01) { dx = 0.01; dy = 0; dist = 0.01; }
      if (dist >= min) continue;
      const push = (min - dist) / 2, nx = dx / dist, ny = dy / dist;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
    }
  }
  for (const u of us) {
    for (const b of S.buildings) {
      const ox = b.w / 2 + u.r - Math.abs(u.x - b.x), oy = b.h / 2 + u.r - Math.abs(u.y - b.y);
      if (ox > 0 && oy > 0) {
        if (ox < oy) u.x += Math.sign(u.x - b.x || 1) * ox; else u.y += Math.sign(u.y - b.y || 1) * oy;
      }
    }
    u.x = clamp(u.x, u.r, W - u.r); u.y = clamp(u.y, u.r, H - u.r);
  }
}

// ---------- Buildings ----------
function updateBuilding(b, dt) {
  if (!b.built || !b.queue.length) return;
  const type = b.queue[0];
  b.qTime += dt;
  if (b.qTime >= UNIT_DEFS[type].time) {
    b.qTime = 0; b.queue.shift();
    const dir = b.team === PLAYER ? 1 : -1;
    const u = addUnit(b.team, type, b.x + dir * (b.w / 2 + 12), b.y + (Math.random() * 40 - 20), b.id);
    if (type === 'worker') { const m = nearestOwnedMine(b.team, u.x, u.y); if (m) u.order = { type: 'gather', mine: m }; }
    else if (b.rally) u.order = { type: 'move', x: b.rally.x + (Math.random() * 30 - 15), y: b.rally.y + (Math.random() * 30 - 15) };
  }
}

export function train(b, type) {
  const d = UNIT_DEFS[type];
  if (!b.built) return false;
  if (b.queue.length >= MAX_QUEUE) { if (b.team === PLAYER) say(`Queue is full (${MAX_QUEUE}).`, 'bad'); return false; }
  if (type === 'commander' && (S.units.some(u => u.team === b.team && u.type === 'commander') || b.queue.includes('commander'))) {
    if (b.team === PLAYER) say('You already have a commander.', 'bad');
    return false;
  }
  if (S.gold[b.team] < d.cost) { if (b.team === PLAYER) say(`Not enough gold. ${d.name} costs ${d.cost}, you have ${S.gold[b.team]}.`, 'bad'); return false; }
  S.gold[b.team] -= d.cost;
  b.queue.push(type);
  return true;
}

export function placeSite(team, type, x, y, builders) {
  const d = BUILDING_DEFS[type];
  if (S.gold[team] < d.cost) { if (team === PLAYER) say(`Not enough gold. An outpost costs ${d.cost}.`, 'bad'); return null; }
  const why = placeFail(type, x, y, team);
  if (why) { if (team === PLAYER) say(why, 'bad'); return null; }
  S.gold[team] -= d.cost;
  const site = addBuilding(team, type, x, y, false);
  for (const u of builders) { u.engage = null; u.order = { type: 'build', site }; }
  if (team === PLAYER) say(`${buildingName(site)} started. Add more workers to build faster.`, 'good');
  return site;
}

// ---------- Groups and orders ----------
export function transferUnit(u, dest, i = 0, n = 1) {
  u.group = dest.id; u.engage = null;
  const p = rallyPoint(dest);
  u.order = { type: 'move', ...formation(p.x, p.y, i, n, u.r) };
}

export function applyGroupOrder(b, o) {
  const ms = members(b);
  b.order = o.type === 'return' ? null : o;
  if (o.type === 'line') { assignLine(ms, o); return ms.length; }
  ms.forEach((u, i) => {
    u.engage = null;
    if (o.type === 'move') u.order = { type: 'move', ...formation(o.x, o.y, i, ms.length, u.r) };
    else if (o.type === 'return') { const p = rallyPoint(b); u.order = { type: 'move', ...formation(p.x, p.y, i, ms.length, u.r) }; }
    else if (o.type === 'transfer') { const dest = byId(o.to); if (dest && dest.kind === 'building' && dest.built) transferUnit(u, dest, i, ms.length); }
  });
  return ms.length;
}

// Courier mode: orders wait in the HQ outbox until the courier picks them up. Issuing never fails.
export function issueOutpostOrder(team, b, order) {
  const tm = S.teams[team];
  tm.outbox[b.id] = order;
  const c = tm.carrier;
  if (c && c.stage === 'hq') c.wait = 0; // the grace period restarts with every new order
  if (team === PLAYER) {
    say(c && c.stage === 'hq' ? `${buildingName(b)}: ${describeOrder(order)}. Courier leaves in ${CARRIER_GRACE}s, or press D.`
                              : `${buildingName(b)}: ${describeOrder(order)}. Queued for the courier's next trip.`);
  }
  return true;
}

// ---------- Courier (courier mode only) ----------
export function spawnCarrier(team) {
  const hq = findHQ(team);
  if (!hq) return null;
  const c = addUnit(team, 'carrier', hq.x + (team === PLAYER ? 1 : -1) * (hq.w / 2 + 12), hq.y - 30, null);
  Object.assign(c, { stage: 'hq', wait: 0, route: [], stop: 0, arrived: false, dwell: 0, manifest: {} });
  S.teams[team].carrier = c;
  return c;
}

const liveOutpost = id => { const b = byId(id); return b && b.kind === 'building' && b.hp > 0 && b.built ? b : null; };

export function dispatchCarrier(team) {
  const tm = S.teams[team], c = tm.carrier;
  if (!c || c.stage !== 'hq') { if (team === PLAYER) say(c ? 'The courier is already out.' : 'No courier right now.', 'bad'); return false; }
  const ids = Object.keys(tm.outbox).map(Number).filter(liveOutpost);
  if (!ids.length) { if (team === PLAYER) say('No orders to carry. Select an outpost and right-click to give one.', 'bad'); tm.outbox = {}; return false; }
  c.manifest = {};
  for (const id of ids) c.manifest[id] = tm.outbox[id];
  tm.outbox = {};
  // Visit the outposts with orders, nearest first from wherever the courier stands.
  const route = [], rem = new Set(ids);
  let x = c.x, y = c.y;
  while (rem.size) {
    let best = null, bd = Infinity;
    for (const id of rem) { const b = byId(id); const d = Math.hypot(b.x - x, b.y - y); if (d < bd) { bd = d; best = id; } }
    route.push(best); rem.delete(best);
    const b = byId(best); x = b.x; y = b.y;
  }
  Object.assign(c, { stage: 'out', route, stop: 0, arrived: false, dwell: 0, wait: 0 });
  if (team === PLAYER) say(`Courier dispatched with ${ids.length} order${ids.length > 1 ? 's' : ''}.`, 'good');
  return true;
}

// Turn back now. Undelivered orders go back into the outbox for the next trip.
export function recallCarrier(team) {
  const tm = S.teams[team], c = tm.carrier;
  if (!c || c.stage === 'hq') return false;
  for (const id in c.manifest) tm.outbox[id] = c.manifest[id];
  c.manifest = {};
  c.stage = 'back';
  if (team === PLAYER) say('Courier returning to HQ. Undelivered orders are back in the outbox.');
  return true;
}

// Fast on friendly ground, slow on enemy ground: the chain matters.
export const carrierSpeed = c => { const o = owner(c.x, c.y); return UNIT_DEFS.carrier.speed * (o === c.team ? 1.25 : o < 0 ? 1 : 0.65); };

function updateCarrier(c, dt) {
  const hq = findHQ(c.team), tm = S.teams[c.team];
  if (!hq) return;
  if (c.stage === 'hq') {
    c.wait += dt;
    if (c.wait >= CARRIER_GRACE && Object.keys(tm.outbox).length) dispatchCarrier(c.team);
    return;
  }
  const step = carrierSpeed(c) * dt;
  if (c.stage === 'out') {
    let b = null;
    while (c.stop < c.route.length) { b = liveOutpost(c.route[c.stop]); if (b) break; delete c.manifest[c.route[c.stop]]; c.stop++; }
    if (!b) { c.stage = 'back'; return; }
    if (approach(c, b, step, c.r + 4)) {
      if (!c.arrived) {
        c.arrived = true; c.dwell = 0;
        if (c.manifest[b.id]) {
          const n = applyGroupOrder(b, c.manifest[b.id]);
          if (c.team === PLAYER) say(`Courier delivered orders to ${buildingName(b)} (${n} troops).`, 'good');
          delete c.manifest[b.id];
        }
      }
      c.dwell += dt;
      if (c.dwell >= CARRIER_DWELL) { c.stop++; c.arrived = false; }
    }
  } else if (approach(c, hq, step, c.r + 4)) {
    if (c.team === PLAYER) say(Object.keys(tm.outbox).length ? 'Courier back at HQ, loading the next orders.' : 'Courier back at HQ.');
    Object.assign(c, { stage: 'hq', wait: 0, manifest: {}, route: [], stop: 0 });
  }
}

// ---------- Enemy AI ----------
function updateAI() {
  const T = ENEMY, hq = findHQ(T), D = DIFF[S.diff];
  if (!hq) return;
  const my = S.units.filter(u => u.team === T);
  const workers = my.filter(u => u.type === 'worker');
  const commander = my.find(u => u.type === 'commander');
  const outposts = S.buildings.filter(b => b.team === T && b.type === 'barracks');

  const constructing = my.some(u => u.order.type === 'build') || outposts.some(b => !b.built);
  const wantOutpost = !constructing && outposts.length < D.aiOutposts && workers.length >= 4;
  if (wantOutpost && S.gold[T] >= BUILDING_DEFS.barracks.cost) {
    const front = [hq, ...outposts].reduce((a, b) => b.x < a.x ? b : a);
    for (let tries = 0; tries < 30; tries++) {
      const ang = Math.PI + (Math.random() - 0.5) * 1.6, dist = 150 + Math.random() * 100;
      const x = front.x + Math.cos(ang) * dist, y = front.y + Math.sin(ang) * dist;
      if (!placeFail('barracks', x, y, T)) { placeSite(T, 'barracks', x, y, [workers[0]]); break; }
    }
  }
  if (!wantOutpost && workers.length + hq.queue.length < D.aiWorkers) train(hq, 'worker');
  if (!commander && outposts.some(b => b.built) && S.gold[T] >= UNIT_DEFS.commander.cost + 60) train(hq, 'commander');
  if (commander && commander.group === hq.id && commander.order.type === 'idle') {
    const built = outposts.filter(b => b.built);
    if (built.length) transferUnit(commander, built.reduce((a, b) => b.x < a.x ? b : a));
  }
  const army = my.filter(u => u.type === 'soldier').length + outposts.reduce((a, b) => a + b.queue.length, 0);
  if (army < D.maxArmy) for (const b of outposts) if (b.built && b.queue.length === 0) train(b, 'soldier');

  // Waves: once a garrison is big enough, send it at the nearest player building.
  for (const b of outposts) {
    if (!b.built || S.t < D.firstWave) continue;
    const ready = members(b).filter(u => u.order.type === 'idle' && !u.engage && Math.hypot(u.x - b.x, u.y - b.y) < 150);
    if (ready.length < D.wave) continue;
    const target = nearest(S.buildings, b.x, b.y, e => e.team === PLAYER && e.hp > 0);
    if (!target) continue;
    const o = { type: 'move', x: target.x + 70, y: target.y };
    if (S.mode === 'direct') applyGroupOrder(b, o); else issueOutpostOrder(T, b, o);
  }
}

// ---------- Main update ----------
export function update(dt) {
  if (S.over || S.paused) return;
  S.t += dt;
  for (const u of S.units) updateUnit(u, dt);
  for (const b of S.buildings) updateBuilding(b, dt);
  separate();
  updateAI();
  if (S.mode === 'courier') for (const t of [PLAYER, ENEMY]) {
    const tm = S.teams[t];
    if (tm.carrier && tm.carrier.hp <= 0) {
      const lost = Object.keys(tm.carrier.manifest).length;
      tm.carrier = null; tm.carrierTimer = 0;
      say(t === PLAYER ? `Your courier was killed${lost ? ` with ${lost} undelivered order${lost > 1 ? 's' : ''}` : ''}. A new one arrives in ${CARRIER_RESPAWN}s.`
                       : `You killed the red courier${lost ? ' and its orders' : ''}.`, t === PLAYER ? 'bad' : 'good');
    }
    if (!tm.carrier) { tm.carrierTimer += dt; if (tm.carrierTimer >= CARRIER_RESPAWN && findHQ(t)) spawnCarrier(t); }
  }
  for (const u of S.units) if (u.hp <= 0 && u.type !== 'carrier') S.kills[1 - u.team]++;
  for (const b of S.buildings) if (b.hp <= 0 && b.type === 'barracks') say(b.team === PLAYER ? `${buildingName(b)} was destroyed.` : `${buildingName(b)} destroyed.`, b.team === PLAYER ? 'bad' : 'good');
  S.units = S.units.filter(u => u.hp > 0);
  S.buildings = S.buildings.filter(b => b.hp > 0);
  for (const u of S.units) if (u.group !== null && !S.buildings.some(b => b.id === u.group)) {
    const nb = nearest(S.buildings, u.x, u.y, b => b.team === u.team && b.built);
    u.group = nb ? nb.id : null;
  }
  S.selected = S.selected.filter(e => e.hp > 0);
  if (S.inspect && S.inspect.hp <= 0) S.inspect = null;
  S.markers = S.markers.filter(m => S.t - m.t < (m.kind === 'line' ? 1.2 : 0.8));
  for (const tm of S.teams) tm.hist = tm.hist.filter(h => S.t - h.t < 30);
  computeTerritory();
  if (!findHQ(PLAYER)) endGame('DEFEAT'); else if (!findHQ(ENEMY)) endGame('VICTORY');
}

function endGame(result) {
  S.over = result;
  S.selected = []; S.placing = null; S.targeting = null;
  if (hooks.onOver) hooks.onOver(result);
}
