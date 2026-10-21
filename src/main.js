// Entry point: wires the simulation to the UI and runs the frame loop.
import { S, settings } from './state.js';
import * as sim from './sim.js';
import * as world from './world.js';
import * as commands from './commands.js';
import { update, hooks } from './sim.js';
import { refreshCover, refreshTop, refreshPanel, refreshTip, showGameOver } from './ui.js';
import { draw } from './render.js';
import { refreshToasts } from './toast.js';
import './input.js';

hooks.onOver = showGameOver;
refreshCover();

const canvas = document.getElementById('game');
const cover = document.getElementById('cover');
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (S && cover.hidden) {
    for (let i = 0; i < S.speed; i++) update(dt);
    refreshToasts();
    refreshTop();
    refreshPanel();
    refreshTip();
    canvas.classList.toggle('target', !!(S.targeting || S.placing));
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Exposed for scripted testing in the browser console.
window.__game = { get S() { return S; }, settings, sim, world, commands, ui: { refreshTop, refreshPanel } };
