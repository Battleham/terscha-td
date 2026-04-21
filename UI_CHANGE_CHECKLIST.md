# UI Change Checklist

Use this checklist for every UI or HUD change, especially on mobile.

## Required Workflow

1. Design pass
   Read `MOBILE_UI_PRINCIPLES.md` and this checklist before proposing the change.

2. Coding pass
   Read both docs again while implementing so the solution stays aligned with the design intent.

3. Validation pass
   A validator pass must review the result against every checklist section below.
   If any item fails, the design and coding passes iterate until the validator can mark the build consistent.

If only one agent is available, that agent must explicitly perform all three passes in sequence.

## Checklist

### A. Viewport And Stage

- The battlefield fills the intended viewport.
- The stage is not unintentionally shrunk to make room for HUD.
- Ground and main platforms remain visible.
- Important action is not hidden behind browser chrome or safe-area edges.

### B. HUD Placement

- HUD uses transparent overlays where possible.
- The hero frame sits low and feels anchored to the battlefield.
- Wave state and enemy count are readable at a glance.
- Essence and selected defender are visible without dominating the screen.
- Informational UI does not cover the active combat lane.

### C. Control Layout

- Left thumb can reach movement comfortably.
- Right thumb can reach jump, strike, and bolt comfortably.
- Controls are large enough to tap reliably.
- Controls do not block core combat visibility more than necessary.

### D. Input Behavior

- Joystick remains engaged until the initiating finger lifts.
- Action buttons do not misfire from stray movement.
- Initial ready state makes controls easy to discover.
- Live play makes controls subtle enough to preserve immersion.
- Page scroll, drag, and pinch zoom are suppressed during play.

### E. State And Transitions

- Ready state, pause state, prep state, and live combat state each read clearly.
- HUD visibility changes are intentional across those states.
- Mobile-only compromises are documented if a feature is disabled.

### F. Visual Consistency

- Transparency, borders, glow, and spacing match the rest of the mobile UI.
- New UI does not look like a desktop artifact squeezed onto the phone.
- Iconography and labels stay concise.
- Any one-off fix was checked against the whole screen after implementation.

### G. Technical Safety

- Desktop layout still works unless intentionally changed.
- Mobile changes are isolated cleanly where possible.
- The implementation avoids brittle coupling between unrelated systems.
- Any cache-sensitive change uses a fresh asset/version query when testing.

## Validator Output

The validator pass should report one of two outcomes:

- `Pass`: the UI is consistent with the principles and checklist.
- `Iterate`: list the failed checklist items and send the work back through design and coding.

Do not accept a partially consistent UI as finished. Iterate until the validator can pass it cleanly.
