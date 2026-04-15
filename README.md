# Skyhold Rampart

A lightweight 2D platformer tower-defense prototype built with plain HTML, CSS, and JavaScript.

## Run

Open [index.html](/Users/yuriysrybnik/Documents/New project/index.html) in a browser.

If your browser prefers a local server for file previews, run:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Features

- Playable hero with movement, jumping, melee strikes, and ranged spell bolts
- Defender deployment on the ground and raised platforms
- Three defender classes: warriors, archers, and mages
- Flying green angel enemies with energy-wing silhouettes
- Fallen defenders that can be resurrected by the hero
- Multi-wave survival loop around a defendable sanctum core

## Controls

- `A` / `D`: move
- `W` or `Space`: jump
- `Mouse 1`: melee strike
- `Mouse 2`: cast bolt
- `1`, `2`, `3`: choose defender type
- `F`: hold for 2 seconds over valid terrain to deploy the selected defender during the preparation phase
- `R`: revive a nearby fallen defender
