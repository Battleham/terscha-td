# Mobile UI Principles

## Purpose

Use these principles for every mobile-facing UI pass in `Terscha TD`. The goal is to preserve the feeling of a fullscreen action game first, then layer readable controls and HUD over it without shrinking the battlefield.

## Core Rules

1. The level owns the screen.
   The map should fill the mobile viewport. UI must adapt around the game, not force the playfield into a small framed box.

2. HUD is an overlay, not a layout blocker.
   Mobile HUD elements should float transparently above the game whenever possible. Avoid opaque panels that steal stage height.

3. Gameplay horizon stays readable.
   Ground, platforms, enemies, the core, and the hero’s jump path must remain visible at a glance. Do not place HUD elements where they hide key combat lanes.

4. The hero frame sits low.
   The hero HUD belongs at the bottom of the screen, with its top edge just below the ground line so it feels anchored to the battlefield instead of hovering inside it.

5. Controls must feel native to thumbs.
   Left thumb owns movement. Right thumb owns actions. Controls must be reachable without stretching and must not require visual precision to stay engaged.

6. Input must stay latched.
   If a touch begins inside the joystick, the joystick remains active until that finger lifts. Sliding outside the visible ring must not cancel movement.

7. Page movement is never allowed during play.
   No scrolling, no accidental page drag, no pinch zoom, and no browser gesture interference while the game is active.

8. Ready state is more instructional than combat state.
   In the initial pause or ready state, controls may be more visible to teach the layout. Once play begins, controls should become more subtle.

9. Transparency over decoration.
   Prefer low-alpha panels, thin borders, and restrained glow. If UI competes with the scene, reduce it.

10. Information density must be prioritized.
   Show the essentials only:
   - hero health and mana
   - current essence
   - selected defender
   - enemy count
   - wave state

11. Desktop and mobile can diverge.
   Mobile should not be a squeezed desktop HUD. Build mobile-specific layout logic where needed.

12. Safe areas are mandatory.
   Account for notches, home indicators, browser chrome, and orientation changes. Test the bottom edge and top corners explicitly.

## HUD Guidance

- Wave state belongs in a small corner badge.
- The `?` button opens detailed info instead of keeping a large info panel on screen.
- Hero bars should be visually dominant inside the hero frame.
- Enemy count should be readable quickly, with minimal wording.
- Defender selection should prefer icons over long labels when space is tight.

## Control Guidance

- Joystick base can stay readable during play.
- Joystick knob should be highly visible in the initial ready state and far more subtle during live play.
- Action buttons should be transparent enough to preserve scene visibility but still large enough for reliable taps.
- Any temporary mobile compromise should be documented clearly if a feature is intentionally disabled.

## Implementation Guidance

- Size the stage from the real viewport first.
- Layer mobile HUD and controls after the stage is correct.
- Use CSS and JS together for mobile: CSS for placement, JS for behavior and viewport-driven state.
- Keep desktop behavior intact unless the task explicitly changes both.
- When changing one HUD/control element, quickly review the entire mobile composition afterward. Small local changes often shift the whole feel.

## Validation Standard

The mobile build is only complete when it feels like a fullscreen game with overlay controls, not a webpage containing a game.
