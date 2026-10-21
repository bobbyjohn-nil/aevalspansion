// Short on-screen messages. Independent of game state so the simulation can call it freely.
const toasts = [];
const box = () => document.getElementById('toasts');

export function say(text, tone) {
  const last = toasts[toasts.length - 1];
  if (last && last.text === text) { last.until = performance.now() + 3500; return; }
  const el = document.createElement('div');
  el.className = 'toast' + (tone ? ' ' + tone : '');
  el.textContent = text;
  box().appendChild(el);
  toasts.push({ text, until: performance.now() + 3500, el });
  while (toasts.length > 4) toasts.shift().el.remove();
}
export function refreshToasts() {
  const now = performance.now();
  for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i].until < now) { toasts[i].el.remove(); toasts.splice(i, 1); }
}
export function clearToasts() { for (const t of toasts) t.el.remove(); toasts.length = 0; }
