import { DIFF, MODES } from './constants.js';

// The whole game state lives in S. Modules import the live binding and read S.* at call time.
export let S = null;
export function setS(v) { S = v; }

export const settings = { diff: 'normal', mode: 'direct' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('aevalspansion.settings') || '{}')); } catch (e) { /* storage unavailable */ }
if (!DIFF[settings.diff]) settings.diff = 'normal';
if (!MODES[settings.mode]) settings.mode = 'direct';
export function saveSettings() { try { localStorage.setItem('aevalspansion.settings', JSON.stringify(settings)); } catch (e) { /* storage unavailable */ } }
