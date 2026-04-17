# Terscha TD

A lightweight 2D platformer tower-defense game built with plain HTML, CSS, and JavaScript.

The first playable level is `Skyhold Rampart`, where the player defends a floating fortress lane against winged invaders while deploying and reviving defenders in real time.

## Current Build

- Game title: `Terscha TD`
- Current level: `Skyhold Rampart`
- Stack: plain `HTML`, `CSS`, and `JavaScript` on a canvas renderer
- Art pipeline: local sprite sheets and stills stored in `assets/`

## Run

Open [index.html](/Users/yuriysrybnik/Documents/New project/index.html) in a browser.

If your browser prefers a local server for file previews, run:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Gameplay Loop

Each round begins with a preparation phase where the player can deploy defenders onto the ground or platforms. Once the wave starts, flying green angelic enemies descend on the sanctum core while the player hero moves, jumps, strikes, casts, and revives defenders. Between waves, the player can choose whether to spend essence to bring fallen defenders back into the line.

## Features

- Playable hero with movement, run/jump controls, melee strikes, ranged magic, damage, defeat, and animated action states
- Defender deployment on the ground and raised platforms during preparation phases
- Three defender classes: warriors, archers, and mages with distinct ranges, durability, and attack timing
- Animated defenders for warrior, archer, and mage idle/attack states
- Animated flying green angel enemies with energy-wing silhouettes
- Prep countdown, mass-revive prompt, and wave-based survival flow around a defendable sanctum core
- Sprite-based art pipeline for hero, enemies, and defenders

## Controls

- `A` / `D`: move
- `Shift`: run
- `W` or `Space`: jump
- `Mouse 1`: melee strike
- `Mouse 2`: cast bolt
- `1`, `2`, `3`: choose defender type
- `F`: instantly deploy the selected defender over valid terrain during the preparation phase
- `R`: tap to revive a nearby fallen defender, or hold for 1 second during preparation to revive all fallen defenders for their combined essence cost
- `Esc`: pause or resume the game

## Project Structure

- [index.html](/Users/yuriysrybnik/Documents/New project/index.html): UI shell and HUD layout
- [styles.css](/Users/yuriysrybnik/Documents/New project/styles.css): menu and HUD styling
- [script.js](/Users/yuriysrybnik/Documents/New project/script.js): gameplay loop, combat, animation logic, rendering, and controls
- [/Users/yuriysrybnik/Documents/New project/assets](/Users/yuriysrybnik/Documents/New project/assets): sprite sheets and stills for hero, defenders, and enemies

## Asset Notes

- Hero animations live in `assets/hero/`
- Enemy animations live in `assets/enemy/`
- Defender stills and animation sheets live in `assets/defenders/`
- Most animated sheets are horizontal strips
- The current game relies on animation timing in `script.js`, so new sprite sheets should keep frame order consistent unless code is updated too

## Current Direction

`Skyhold Rampart` is the first combat sandbox for tuning moment-to-moment feel: jump arc, prep pressure, revive economy, hero combat, defender targeting, and animation-synced attacks. The current focus is making the lane combat readable, responsive, and expressive before expanding to more levels or systems.
