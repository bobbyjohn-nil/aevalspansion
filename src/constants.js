export const W = 1200, H = 700, CELL = 20, GW = W / CELL, GH = H / CELL;
export const PLAYER = 0, ENEMY = 1;
export const TEAM_NAME = ['Blue', 'Red'];
export const TEAM_COLOR = ['#4a9eff', '#ff5a5a'];
export const TEAM_RGB = [[74, 158, 255], [255, 90, 90]];

// terr = radius of territory influence each thing projects.
export const UNIT_DEFS = {
  worker:    { name: 'Worker',    hp: 30,  speed: 90,  r: 7,  cost: 50,  time: 6,  dmg: 2,  range: 14, aggro: 0,   cd: 1.0, terr: 35,  desc: 'Mines gold and builds outposts.' },
  soldier:   { name: 'Soldier',   hp: 60,  speed: 75,  r: 8,  cost: 60,  time: 5,  dmg: 8,  range: 18, aggro: 130, cd: 0.8, terr: 65,  desc: 'Fights anything that comes near.' },
  commander: { name: 'Commander', hp: 160, speed: 70,  r: 10, cost: 150, time: 10, dmg: 12, range: 20, aggro: 130, cd: 0.8, terr: 160, desc: 'Strong, projects a big territory radius.' },
  carrier:   { name: 'Courier',   hp: 25,  speed: 140, r: 5,  cost: 0,   time: 0,  dmg: 0,  range: 0,  aggro: 0,   cd: 1.0, terr: 0,   desc: 'Carries orders along the outpost chain.' },
};
export const BUILDING_DEFS = {
  hq:       { name: 'HQ',      hp: 800, w: 70, h: 70, cost: 0,   buildTime: 0,  terr: 240, siteTerr: 0,  sight: 260 },
  barracks: { name: 'Outpost', hp: 350, w: 56, h: 56, cost: 100, buildTime: 15, terr: 200, siteTerr: 70, sight: 180 },
};
export const DIFF = {
  easy:   { label: 'Easy',   desc: 'Red mines slowly, builds two outposts, and sends no wave before 5 minutes.',  aiIncome: 0.7,  aiWorkers: 5, aiOutposts: 2, wave: 8, aiGold: 100, firstWave: 300, maxArmy: 10 },
  normal: { label: 'Normal', desc: 'Red mines at your rate, builds three outposts, and sends no wave before 3 minutes.', aiIncome: 1.0, aiWorkers: 6, aiOutposts: 3, wave: 6, aiGold: 150, firstWave: 180, maxArmy: 18 },
  hard:   { label: 'Hard',   desc: 'Red mines faster, starts richer, builds four outposts, and attacks from 90 seconds.', aiIncome: 1.35, aiWorkers: 8, aiOutposts: 4, wave: 5, aiGold: 250, firstWave: 90, maxArmy: 30 },
};
export const MODES = {
  direct:  { label: 'Direct',  desc: 'Command any of your units anywhere, instantly. Recommended for a first game.' },
  courier: { label: 'Courier', desc: 'Orders for distant garrisons ride a courier along your outpost chain. It can be intercepted. Slower, riskier, more interesting.' },
};
export const MINE_R = 16, GATHER_TIME = 1.5, CARRY = 10, MAX_QUEUE = 5;
export const CHAIN_RANGE = 260;
export const CARRIER_DWELL = 1, CARRIER_GRACE = 3, CARRIER_RESPAWN = 8;
export const LINE_SPACING = 20, LINE_MIN_DRAG = 24;

export const ICON = {
  worker: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
  soldier: '<svg viewBox="0 0 24 24"><polygon points="12,3 21,20 3,20"/></svg>',
  commander: '<svg viewBox="0 0 24 24"><polygon points="12,2 21.5,9 18,20.5 6,20.5 2.5,9"/></svg>',
  carrier: '<svg viewBox="0 0 24 24"><polygon points="12,2 18,12 12,22 6,12"/></svg>',
  hq: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18"/></svg>',
  barracks: '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14"/></svg>',
  mine: '<svg viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12"/></svg>',
};
