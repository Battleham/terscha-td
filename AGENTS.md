# Repo Guidance

## Project Identity

- Game title: `Terscha TD`
- First playable level: `Skyhold Rampart`
- Genre: 2D platformer tower defense
- Stack: plain `HTML`, `CSS`, `JavaScript`, and canvas rendering

## Core Files

- `index.html`: HUD and page shell
- `styles.css`: UI styling
- `script.js`: game state, controls, rendering, combat, waves, and animation timing
- `assets/`: local sprite sheets and still images

## Gameplay Expectations

- The hero is a platforming action character, not a stationary commander
- Defenders are deployed during preparation phases
- `R` has two behaviors:
  - Tap: revive one nearby fallen defender
  - Hold during prep: revive all fallen defenders for the shown essence cost
- Defender attacks are increasingly animation-driven and should stay synced to projectile/melee release timing

## Art And Animation Conventions

- Hero sheets live in `assets/hero/`
- Enemy sheets live in `assets/enemy/`
- Defender sheets live in `assets/defenders/`
- Animated sheets are horizontal strips unless intentionally changed
- If a frame’s gameplay meaning changes, update both art assumptions and the related timing logic in `script.js`

## Working Preferences

- Preserve the current visual direction and naming:
  - Game: `Terscha TD`
  - Level 1: `Skyhold Rampart`
- Prefer local assets over remote URLs
- Keep the game runnable with a simple static server
- When adjusting feel, prioritize:
  - readable combat
  - satisfying jump/movement
  - clear prep/combat transitions
  - animation timing that matches gameplay events
