// DOM panels: top bar, command panel, hover tooltip, cover and game-over screens.
import { S, settings } from './state.js';
import { PLAYER, ENEMY, TEAM_NAME, TEAM_COLOR, UNIT_DEFS, DIFF, MODES, MAX_QUEUE, CARRIER_GRACE, CARRIER_RESPAWN, ICON } from './constants.js';
import { byId, buildingName, members, ownOutposts, owner, placeFail, describeOrder, unitState, commandable, territoryShare, esc, fmtTime } from './world.js';
import { entityAt } from './commands.js';

const $ = id => document.getElementById(id);

export function refreshCover() {
  for (const b of $('segDiff').children) b.classList.toggle('on', b.dataset.v === settings.diff);
  for (const b of $('segMode').children) b.classList.toggle('on', b.dataset.v === settings.mode);
  $('diffDesc').textContent = DIFF[settings.diff].desc;
  $('modeDesc').textContent = MODES[settings.mode].desc;
  $('courierBox').hidden = settings.mode !== 'courier';
}

export function showGameOver(result) {
  $('resultTxt').textContent = result;
  $('resultTxt').className = 'result ' + (result === 'VICTORY' ? 'win' : 'lose');
  $('resultSub').textContent = result === 'VICTORY' ? 'The red HQ is rubble. The map is yours.' : 'Your HQ has fallen. Red holds the field.';
  const stat = (k, v) => `<div><small>${k}</small><strong>${v}</strong></div>`;
  $('stats').innerHTML = stat('Time', fmtTime(S.t)) + stat('Units killed', S.kills[PLAYER]) + stat('Units lost', S.kills[ENEMY])
    + stat('Outposts built', S.teams[PLAYER].built) + stat('Territory', Math.round(territoryShare(PLAYER) * 100) + '%')
    + stat('Mode', `${MODES[S.mode].label} / ${DIFF[S.diff].label}`);
  $('over').hidden = false;
}

function tally(list) {
  const t = {};
  for (const u of list) t[u.type] = (t[u.type] || 0) + 1;
  return t;
}
function chipHtml(team, label) {
  const t = tally(S.units.filter(u => u.team === team && u.type !== 'carrier'));
  const posts = S.buildings.filter(b => b.team === team && b.type === 'barracks');
  const ic = type => `<span class="ic" title="${UNIT_DEFS[type].name}s">${ICON[type]}${t[type] || 0}</span>`;
  return `<span class="who">${label}</span>${ic('worker')}${ic('soldier')}${ic('commander')}<span class="ic" title="Outposts">${ICON.barracks}${posts.length}</span>`
       + (team === ENEMY ? `<span class="ic" title="Red gold" style="color:var(--gold)">${S.gold[ENEMY]}g</span>` : '');
}

export function courierStatus() {
  const tm = S.teams[PLAYER], c = tm.carrier, waiting = Object.keys(tm.outbox).length;
  if (!c) return `Courier lost. Replacement in ${Math.ceil(CARRIER_RESPAWN - tm.carrierTimer)}s`;
  if (c.stage === 'hq') return waiting ? `Courier at HQ, ${waiting} order${waiting > 1 ? 's' : ''} loaded, leaves in ${Math.max(0, Math.ceil(CARRIER_GRACE - c.wait))}s` : 'Courier at HQ, no orders';
  if (c.stage === 'out') { const b = byId(c.route[c.stop]); return `Courier heading to ${b ? buildingName(b) : '...'} (${c.route.length - c.stop} stop${c.route.length - c.stop > 1 ? 's' : ''} left)${waiting ? `, ${waiting} waiting at HQ` : ''}`; }
  return `Courier returning to HQ${waiting ? `, ${waiting} waiting` : ''}`;
}

export function refreshTop() {
  const tm = S.teams[PLAYER];
  $('gold').textContent = S.gold[PLAYER];
  const inc = tm.hist.reduce((a, h) => a + h.amt, 0) * (60 / Math.min(30, Math.max(S.t, 1)));
  $('income').textContent = `+${Math.round(inc)}/min`;
  $('chipYou').innerHTML = chipHtml(PLAYER, 'You');
  $('chipFoe').innerHTML = chipHtml(ENEMY, 'Red');
  $('time').textContent = fmtTime(S.t) + (S.paused ? ' paused' : '');
  if (S.mode === 'courier') {
    const c = tm.carrier;
    $('courierTxt').textContent = courierStatus();
    $('dispatchBtn').hidden = !(c && c.stage === 'hq' && Object.keys(tm.outbox).length);
  }
}

function tutorialHint() {
  const outposts = S.buildings.filter(b => b.team === PLAYER && b.type === 'barracks');
  const troops = S.units.filter(u => u.team === PLAYER && u.type !== 'worker' && u.type !== 'carrier');
  if (!outposts.length) return `<b>Build an outpost.</b> Click a worker (or press <kbd>Tab</kbd>), press <kbd>B</kbd>, then click inside your blue territory within the dashed ring. Aim toward the centre mines.`;
  if (outposts.some(b => !b.built)) return `<b>Outpost under construction.</b> Select more workers and right-click the site to speed it up. Workers return to mining when it is done.`;
  if (!troops.length && !outposts.some(b => b.queue.length)) return `<b>Train soldiers.</b> Click an outpost and press <kbd>S</kbd> (60g). Soldiers are trained at outposts, not the HQ.`;
  if (troops.length < 4) return `<b>Build an army.</b> Keep training soldiers. The HQ can train one <b>Commander</b> (<kbd>C</kbd>, 150g) that projects a huge territory radius.`;
  return `<b>Push the border.</b> Select troops and right-click toward the centre mines, or <b>right-drag</b> to draw a line they form up along. ${S.mode === 'courier' ? 'Outpost garrison orders travel by courier.' : 'Select an outpost and right-click to send its whole garrison.'}`;
}

function card(cls, icon, name, sub, hp) {
  return `<div class="card ${cls}"><div class="icon">${icon}</div><div><div class="name">${name}</div><div class="sub">${sub}</div>${hp ? `<div class="hp"><i style="width:${Math.round(hp * 100)}%"></i></div>` : ''}</div></div>`;
}
const btn = (act, key, label, cost, extra) => `<button class="btn${extra && extra.cls ? ' ' + extra.cls : ''}" data-act="${act}" ${extra && extra.disabled ? 'disabled' : ''} title="${extra && extra.title ? esc(extra.title) : ''}"><span class="key">${key}</span>${label}${cost ? `<span class="cost">${cost}g</span>` : ''}</button>`;

export function refreshPanel() {
  const sel = S.selected, tm = S.teams[PLAYER], c = tm.carrier, ins = S.inspect;
  const idleWorkers = S.units.filter(u => commandable(u) && u.type === 'worker' && u.order.type === 'idle').length;
  const sig = [S.over, S.placing, S.targeting, S.gold[PLAYER] >= 150, S.gold[PLAYER] >= 100, S.gold[PLAYER] >= 60, S.gold[PLAYER] >= 50, idleWorkers > 0, Math.floor(S.t / 2),
               c && c.stage, c && Object.keys(c.manifest).join(','), Object.keys(tm.outbox).join(','), ins && `${ins.id}:${Math.round(ins.hp || ins.gold)}`,
               ...sel.map(e => `${e.id}:${e.queue ? e.queue.length : ''}:${e.built === false ? Math.round(e.progress * 20) : ''}:${e.order ? e.order.type : ''}:${Math.round(e.hp)}:${e.engage ? 1 : 0}:${e.carry}`)].join('|');
  if (sig === S.panelSig) return;
  S.panelSig = sig;
  const parts = [];
  const hint = t => parts.push(`<div class="hint">${t}</div>`);

  if (S.placing) {
    hint(`<b>Placing an outpost (100g).</b> Green ghost means the spot is valid: inside your territory and inside a dashed ring. Left-click to build, right-click or <kbd>Esc</kbd> to cancel.`);
  } else if (S.targeting) {
    hint(`<b>Attack-move.</b> Left-click a point or an enemy, or drag to draw a line. Right-click or <kbd>Esc</kbd> to cancel.`);
  } else if (ins) {
    if (ins.kind === 'mine') {
      const o = owner(ins.x, ins.y);
      parts.push(card('mine', ICON.mine, 'Gold mine', `${ins.gold} of ${ins.max} gold left. ${o === PLAYER ? 'Inside your territory: your workers can mine it.' : o === ENEMY ? 'Inside red territory.' : 'Neutral: nobody can mine it yet.'}`, ins.gold / ins.max));
      hint(`Select workers and right-click a mine inside your territory to mine it. To claim a neutral mine, push your border over it with an outpost or troops.`);
    } else if (ins.kind === 'building') {
      const g = members(ins).length;
      parts.push(card('foe', ICON[ins.type], buildingName(ins), `${Math.round(ins.hp)} / ${ins.maxHp} HP${ins.built ? '' : ` (building, ${Math.round(ins.progress * 100)}%)`}${ins.type === 'barracks' ? ` | garrison ${g}` : ''}${ins.queue.length ? ` | training ${UNIT_DEFS[ins.queue[0]].name} (${ins.queue.length} queued)` : ''}`, ins.hp / ins.maxHp));
      hint(ins.type === 'hq' ? `<b>This is the target.</b> Destroy the red HQ to win.` : `Enemy outpost. Destroying it collapses red territory around it and sends its garrison running.`);
    } else {
      const d = UNIT_DEFS[ins.type];
      const sub = ins.type === 'carrier' ? `${Math.round(ins.hp)} / ${ins.maxHp} HP | ${ins.stage === 'hq' ? 'waiting at the red HQ' : ins.stage === 'out' ? `carrying ${Object.keys(ins.manifest).length} order(s)` : 'returning to the red HQ'}` : `${Math.round(ins.hp)} / ${ins.maxHp} HP | ${unitState(ins)} | ${d.desc}`;
      parts.push(card('foe', ICON[ins.type], `Red ${d.name}`, sub, ins.hp / ins.maxHp));
      hint(ins.type === 'carrier' ? `Kill the red courier and the orders it carries are lost. It is fast on red ground and slow on yours.` : `Select your troops and right-click this unit to attack it.`);
    }
  } else if (!sel.length) {
    hint(tutorialHint());
    const acts = [];
    if (idleWorkers) acts.push(btn('idle', 'Tab', `Select idle worker (${idleWorkers})`, 0));
    acts.push(btn('help', 'F1', 'How to play', 0));
    parts.push(`<div class="actions">${acts.join('')}</div>`);
  } else {
    for (const b of sel.filter(e => e.kind === 'building')) {
      const q = b.queue.length ? ` | training ${UNIT_DEFS[b.queue[0]].name} ${Math.ceil(UNIT_DEFS[b.queue[0]].time - b.qTime)}s (${b.queue.length}/${MAX_QUEUE})` : '';
      if (b.type === 'hq') {
        parts.push(card('you', ICON.hq, 'HQ', `${Math.round(b.hp)} / ${b.maxHp} HP${q}${b.rally ? ' | rally point set' : ''}`, b.hp / b.maxHp));
        const hasCmd = S.units.some(u => u.team === PLAYER && u.type === 'commander') || b.queue.includes('commander');
        parts.push(`<div class="actions">${btn('worker', 'W', 'Train Worker', 50, { disabled: S.gold[PLAYER] < 50, title: UNIT_DEFS.worker.desc })}${btn('commander', 'C', 'Train Commander', 150, { disabled: S.gold[PLAYER] < 150 || hasCmd, title: hasCmd ? 'You already have a commander' : UNIT_DEFS.commander.desc })}</div>`);
        hint(`Right-click the ground to set a rally point for new units. Soldiers are trained at <b>outposts</b>: select a worker and press <kbd>B</kbd> to build one.`);
      } else {
        const g = members(b);
        const gt = tally(g);
        const gtxt = g.length ? Object.entries(gt).map(([k, v]) => `${v} ${UNIT_DEFS[k].name}${v > 1 ? 's' : ''}`).join(', ') : 'no troops';
        parts.push(card('you', ICON.barracks, buildingName(b), b.built ? `${Math.round(b.hp)} / ${b.maxHp} HP | garrison: ${gtxt}${q}` : `Under construction, ${Math.round(b.progress * 100)}%`, b.built ? b.hp / b.maxHp : b.progress));
        if (b.built) {
          parts.push(`<div class="actions">${btn('soldier', 'S', 'Train Soldier', 60, { disabled: S.gold[PLAYER] < 60, title: UNIT_DEFS.soldier.desc })}${btn('attack', 'A', 'Send garrison', 0, { disabled: !g.length })}${btn('recall', 'R', 'Recall garrison', 0, { disabled: !g.length })}</div>`);
          let t = `<b>Right-click</b> the ground to send the whole garrison there, or <b>right-drag</b> to form them along a line. Right-click another of your buildings to transfer them.`;
          if (S.mode === 'courier') {
            const onboard = c && c.manifest[b.id], waiting = tm.outbox[b.id];
            t += `<br>Courier: ${waiting ? `<b>waiting at HQ</b>: ${describeOrder(waiting)}` : onboard ? `<b>on the way</b>: ${describeOrder(onboard)}` : `last delivered: ${describeOrder(b.order)}`}.`;
          }
          hint(t);
        } else {
          hint(`Select workers and right-click this site to help build it.`);
        }
      }
    }
    const courier = sel.find(e => e.kind === 'unit' && e.type === 'carrier');
    if (courier) {
      const onboard = Object.entries(courier.manifest).map(([id, o]) => { const b = byId(+id); return b ? `${buildingName(b)}: ${describeOrder(o)}` : ''; }).filter(Boolean);
      const waiting = Object.entries(tm.outbox).map(([id, o]) => { const b = byId(+id); return b ? `${buildingName(b)}: ${describeOrder(o)}` : ''; }).filter(Boolean);
      parts.push(card('you', ICON.carrier, 'Courier', `${Math.round(courier.hp)} / ${courier.maxHp} HP | ${courierStatus()}`, courier.hp / courier.maxHp));
      parts.push(`<div class="actions">${btn('dispatch', 'D', 'Dispatch now', 0, { disabled: !(courier.stage === 'hq' && waiting.length) })}${btn('recallCourier', '', 'Return to HQ', 0, { disabled: courier.stage === 'hq' })}</div>`);
      hint(`${onboard.length ? `<b>Carrying:</b> ${onboard.join('; ')}.` : ''} ${waiting.length ? `<b>Outbox at HQ:</b> ${waiting.join('; ')}.` : ''} ${!onboard.length && !waiting.length ? 'No orders. Select an outpost and right-click to give one.' : ''} Fast on your ground, slow on red ground. Guard the chain.`);
    }
    const units = sel.filter(e => e.kind === 'unit' && e.type !== 'carrier');
    if (units.length) {
      const t = tally(units);
      const types = Object.keys(t);
      const hp = units.reduce((a, u) => a + u.hp, 0) / units.reduce((a, u) => a + u.maxHp, 0);
      const name = units.length === 1 ? UNIT_DEFS[units[0].type].name : Object.entries(t).map(([k, v]) => `${v} ${UNIT_DEFS[k].name}${v > 1 ? 's' : ''}`).join(', ');
      const sub = units.length === 1 ? `${Math.round(units[0].hp)} / ${units[0].maxHp} HP | ${unitState(units[0])}${units[0].carry ? ` | carrying ${units[0].carry}g` : ''}` : `${units.length} selected | ${Math.round(hp * 100)}% health`;
      parts.push(card('you', ICON[types.length === 1 ? types[0] : 'soldier'], name, sub, hp));
      const acts = [];
      if (t.worker) acts.push(btn('build', 'B', 'Build Outpost', 100, { disabled: S.gold[PLAYER] < 100, title: 'Must be in your territory and within range of the HQ or another outpost' }));
      if (t.soldier || t.commander) acts.push(btn('attack', 'A', 'Attack-move', 0));
      acts.push(btn('hold', 'H', 'Hold', 0));
      parts.push(`<div class="actions">${acts.join('')}</div>`);
      hint(t.worker && !t.soldier && !t.commander
        ? `Right-click a <b>gold mine</b> inside your territory to mine, or an unfinished outpost to help build it.`
        : `Right-click: ground to move, an enemy to attack, one of your outposts to station there. <b>Right-drag</b> to draw a line and they form up along it. Troops auto-fight anything nearby and return to their post afterwards.`);
    }
  }
  $('panel').innerHTML = parts.join('');
}

export function refreshTip() {
  const tip = $('tip');
  if (!S.mouseClient || S.drag || S.rdrag || S.paused || S.over || S.mouse.x < 0) { tip.hidden = true; S.hover = null; return; }
  let html = '';
  if (S.placing) {
    const why = placeFail(S.placing, S.mouse.x, S.mouse.y, PLAYER);
    html = why ? `<div class="bad">${esc(why)}</div>` : `<div class="ok">Click to build here (100g)</div>`;
    S.hover = null;
  } else {
    const e = entityAt(S.mouse.x, S.mouse.y);
    S.hover = e;
    if (!e) { tip.hidden = true; return; }
    if (e.kind === 'mine') {
      const o = owner(e.x, e.y);
      html = `<div class="t" style="color:var(--gold)">Gold mine</div><div>${e.gold} gold left</div><div class="m">${o === PLAYER ? 'Yours: workers can mine it' : o === ENEMY ? 'Red territory' : 'Neutral: push your border over it'}</div>`;
    } else if (e.kind === 'building') {
      const g = members(e).length;
      html = `<div class="t" style="color:${TEAM_COLOR[e.team]}">${buildingName(e)}</div><div>${Math.round(e.hp)} / ${e.maxHp} HP</div>`
           + (e.built ? (e.type === 'barracks' ? `<div class="m">Garrison: ${g}</div>` : '') : `<div class="m">Under construction ${Math.round(e.progress * 100)}%</div>`)
           + (e.queue.length ? `<div class="m">Training ${UNIT_DEFS[e.queue[0]].name} (${e.queue.length} queued)</div>` : '');
    } else {
      const d = UNIT_DEFS[e.type];
      const st = e.type === 'carrier' ? (e.stage === 'hq' ? 'Waiting at HQ' : e.stage === 'out' ? `Delivering ${Object.keys(e.manifest).length} order(s)` : 'Returning to HQ') : unitState(e);
      html = `<div class="t" style="color:${TEAM_COLOR[e.team]}">${TEAM_NAME[e.team]} ${d.name}</div><div>${Math.round(e.hp)} / ${e.maxHp} HP</div><div class="m">${st}${e.carry ? `, carrying ${e.carry}g` : ''}</div>`
           + (e.team === PLAYER && e.type !== 'carrier' && !commandable(e) ? `<div class="m">Outside HQ sight: command it through its outpost</div>` : '');
    }
  }
  tip.innerHTML = html;
  tip.hidden = false;
  const r = $('stage').getBoundingClientRect();
  let x = S.mouseClient.x - r.left + 14, y = S.mouseClient.y - r.top + 14;
  if (x + tip.offsetWidth > r.width - 8) x = S.mouseClient.x - r.left - tip.offsetWidth - 10;
  if (y + tip.offsetHeight > r.height - 8) y = S.mouseClient.y - r.top - tip.offsetHeight - 10;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}

