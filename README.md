# Mini RTS

A bare-bones real-time strategy game in a single HTML file. No dependencies, no build step.

## Run

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

and visit http://localhost:8000.

## Goal

Destroy the red HQ before red destroys yours.

## How it works

**Territory.** Every HQ, outpost, commander and troop projects influence around itself. The side with
more influence owns that patch of map (shaded in its colour). Territory matters:

- You can only build inside your own territory.
- Workers can only mine gold from mines inside your territory. The two centre mines are neutral at
  the start, so you have to push your border out to use them.
- Territory moves with your troops: marching an army forward (especially the commander, who projects
  a large radius) carves out ground.

**Outposts.** Barracks are outposts. Each one must be placed within 260 of your HQ or another outpost,
so they form a chain. Soldiers trained at an outpost belong to that outpost's garrison, and workers can
drop gold at any outpost, so a forward outpost lets you mine forward mines.

**The carrier and the fog of command.** You sit at the HQ. You can see and directly control only what
is inside the HQ's sight circle. Everything else reaches you through the carrier, which rides the outpost
chain from HQ to each outpost and back:

- Orders for an outpost's garrison can only be loaded while the carrier is at the HQ. Press **D** to
  dispatch it (it also leaves on its own after 12 seconds). Orders are delivered when it reaches each
  outpost.
- Troop updates come back with the carrier. Troops outside HQ sight are drawn faded at their last
  reported position, so what you see in the field can be out of date.
- The carrier can be killed. Orders it was carrying are lost and a replacement appears at the HQ after
  a few seconds. Guard the chain.
- The red AI plays by the same rule: its orders ride its own carrier, which you can intercept.

**Commander.** Trained at the HQ (one at a time). Strong, and projects a big territory radius. Send it
to an outpost to station it there; it then moves with that garrison's orders.

## Controls

| Action | Input |
| --- | --- |
| Select units near the HQ | Left-click or left-drag a box |
| Select a building | Left-click it |
| Move / attack / gather / help build | Right-click on ground / enemy / gold mine / your unfinished building |
| Station selected troops at an outpost | Right-click the outpost |
| Build Outpost (100 gold) | Select a worker, press **B** (or the button), click a spot |
| Train Worker (50 gold) | Select the HQ, press **W** |
| Train Commander (150 gold) | Select the HQ, press **C** |
| Train Soldier (60 gold) | Select an outpost, press **S** |
| Order an outpost's garrison | Select the outpost, then right-click: map = attack-move, the outpost itself = recall, another building = transfer |
| Dispatch the carrier | **D** (or the button in the top bar) |
| Cancel placement / deselect | **Esc** or right-click |
| Pause | **P** |
| Restart after game over | **R** |

## Rules of thumb

- Workers (circles) mine and start mining on their own. Soldiers (triangles) and the commander (pentagon)
  attack anything that comes near, then return to where they were posted.
- Outposts under construction can be attacked. If an outpost falls, its garrison falls back to the nearest
  friendly building.
- The red AI mines, chains outposts toward you, trains soldiers and a commander, and sends waves once a
  garrison is big enough.
