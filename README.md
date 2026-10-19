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

## Controls

| Action | Input |
| --- | --- |
| Select units | Left-click or left-drag a box |
| Select a building | Left-click it |
| Move / attack / gather / help build | Right-click on ground / enemy / gold mine / your unfinished building |
| Build Barracks (100 gold) | Select a worker, press **B** (or the button), click a spot |
| Train Worker (50 gold) | Select the HQ, press **W** |
| Train Soldier (60 gold) | Select a Barracks, press **S** |
| Cancel placement / deselect | **Esc** or right-click |
| Pause | **P** |
| Restart after game over | **R** |

## Rules

- Workers (circles) mine gold and carry it back to the HQ. New workers start mining automatically.
- Soldiers (triangles) attack any enemy that comes near them while idle or moving.
- Buildings must be constructed by a worker. Construction sites can be attacked.
- The red AI gathers, builds barracks, and sends attack waves when it has enough soldiers.
