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
- Before generating, cleaning, or replacing hero animation sheets, read and follow `assets/hero/reference/ANIMATION_PIPELINE_NOTES.md`; it is the canonical hero animation cleanup pipeline and overrides older assumptions.
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

## UI Workflow

- Before any mobile UI or HUD work, read:
  - `MOBILE_UI_PRINCIPLES.md`
  - `UI_CHANGE_CHECKLIST.md`
- Treat those two files as required context, not optional reference material.
- For UI changes, use this workflow:
  - Design pass: interpret the requested change through the principles
  - Coding pass: implement while actively checking against the checklist
  - Validation pass: verify the result against the checklist and reject inconsistencies
- If separate agents are available, the validator agent should review after design and coding are complete and force iteration if any checklist item fails.
- If only one agent is available, emulate all three roles in sequence before declaring the UI change done.
- For mobile changes specifically:
  - preserve fullscreen stage ownership
  - prefer transparent overlays over opaque panels
  - keep controls thumb-friendly and latched correctly
  - prevent browser scrolling or zoom interference during play
