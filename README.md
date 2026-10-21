# Aevalspansion

A real-time strategy game about territory. Plain HTML, CSS and ES modules. No dependencies, no build step.

## Run

Serve the folder:

```
npm run dev
```

and visit http://localhost:3000. The game uses ES modules, so it needs to be served over HTTP rather than
opened as a file. It deploys as-is to any static host (GitHub Pages, Netlify, Vercel): point it at the repo root.

## Layout

- `index.html`: markup, CSS, cover screen, help and menus.
- `src/constants.js`: unit, building and difficulty numbers.
- `src/state.js`: the game state object and saved settings.
- `src/world.js`: geometry, lookups, territory, formations.
- `src/sim.js`: the simulation: units, buildings, courier, enemy AI, per-tick update. Orders are plain data objects,
  so this is the part a future server would run for multiplayer.
- `src/commands.js`: player commands (clicks and hotkeys into orders).
- `src/input.js`: mouse and keyboard listeners.
- `src/ui.js`: top bar, command panel, tooltip, overlays.
- `src/render.js`: canvas drawing.
- `src/main.js`: wiring and the frame loop. Exposes `window.__game` for console testing.

## Goal

Destroy the red HQ before red destroys yours. The whole map is visible at all times, including every
enemy unit, building, and the red territory. Hover anything for details, click an enemy to inspect it.

## How it works

**Territory.** Every HQ, outpost, commander and troop projects influence around itself. The side with
more influence owns that patch of map (shaded in its colour, with a bright border line). Territory matters:

- You can only build inside your own territory.
- Workers can only mine gold from mines inside your territory. The two centre mines are neutral at
  the start, so you have to push your border out to use them.
- Territory moves with your troops: marching an army forward (especially the commander, who projects
  a large radius) carves out ground.

**Outposts.** Each outpost (100 gold) must be placed within range of your HQ or another outpost, so they
form a chain. Soldiers are trained at outposts and belong to that outpost's garrison. Workers can drop
gold at any outpost, so a forward outpost lets you mine forward mines.

**Commander.** Trained at the HQ (one at a time). Strong, and projects a big territory radius.

## Cover screen options

- **Difficulty** (Easy / Normal / Hard) changes how fast red mines, how many outposts it builds, how big
  its army gets, and how long before its first wave.
- **Command mode**
  - **Direct** (default): command any of your units anywhere, instantly.
  - **Courier**: you can only directly command units inside the HQ's sight circle. Orders for an
    outpost's garrison go into an outbox at the HQ. The courier picks them up a few seconds after the
    last order (or press **D** to send it now), visits only the outposts with orders by the shortest
    route, and returns. Orders given while it is away wait for the next trip. It is fast on your
    territory and slow on red territory. Click it to see its cargo or call it back. If it dies, the
    orders on board are lost. Red plays by the same rule, so its courier can be hunted.

Settings are remembered in the browser.

## Controls

| Action | Input |
| --- | --- |
| Select units | Left-click or left-drag a box. Shift-click adds. Double-click selects all of that type. **Tab** picks an idle worker |
| Move / attack / mine / help build | Right-click on ground / enemy / gold mine / your unfinished outpost. **A** then left-click does the same |
| Form a line | Right-drag to draw a line. Selected troops, or a selected outpost's garrison, spread evenly along it |
| Hold position | **H** |
| Build Outpost (100 gold) | Select a worker, press **B**, click a spot. Green ghost means the spot is valid |
| Train Worker (50) / Commander (150) | Select the HQ, press **W** / **C** |
| Train Soldier (60) | Select an outpost, press **S** |
| Set HQ rally point | Select the HQ, right-click ground |
| Send a garrison | Select an outpost, then right-click: ground = attack-move everyone, the outpost itself or **R** = recall, another building = transfer |
| Station troops at an outpost | Select troops, right-click the outpost |
| Control groups | **Ctrl+1** to **Ctrl+5** save, **1** to **5** recall |
| Dispatch the courier (Courier mode) | **D** |
| Cancel placement / deselect | **Esc** or right-click |
| Pause / speed / help | **P** / **T** / **F1** |

## Rules of thumb

- Workers (circles) mine on their own and show an "idle" tag when they have nothing to do. Soldiers
  (triangles) and the commander (pentagon) attack anything that comes near, then return to where they
  were posted.
- Outposts under construction can be attacked. If an outpost falls, its garrison falls back to the nearest
  friendly building.
- The bottom panel always tells you what to do next when nothing is selected.
