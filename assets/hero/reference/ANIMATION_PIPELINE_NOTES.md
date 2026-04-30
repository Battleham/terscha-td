# Canonical Hero Animation Pipeline

This file overrides the earlier hero animation workflow. Raw generated sheets are
never final game assets. Treat image generation as a pose-source step only; the
cleanup/repack pipeline is the reliable part.

## Locked Reference

- Current character reference:
  `assets/hero/reference/hero_new_model_ref_asym_leg_clean.png`
- The camera-near/right pant leg has gold embroidery.
- The far/left pant leg is plain.
- Animation prompts must mention that asymmetry whenever legs matter. It is the
  main visual marker for keeping run/jump leg identity readable.

## Generation Contract

Generate sources for cleanup, not finished sheets.

- Use a perfectly flat `#00ff00` chroma-key background.
- Keep the character/effects away from the source image edges.
- Preserve full body, staff, sash, sandals, and all effects in every intended
  frame.
- Avoid shadows, floor planes, checkerboards, gradients, watermarks, text,
  labels, and frame numbers.
- Do not ask the model for native transparency; use chroma removal locally.

### Horizontal Strip Sources

Use for simple separated pose rows such as run, idle, hit, death, melee, or
magic when effects are attached to the character.

- Ask for exactly N separated full-body poses in one horizontal row.
- Poses do not need perfect equal spacing.
- Require generous blank green space between poses.
- The cleanup script will detect connected components, sort them, and repack
  them into exact 256px frames.

### Grid Sources

Use grid sources when any effect might become separate foreground, especially:

- jump sheets with dust and wind jets
- magic sheets with detached spell elements
- any multi-row output from image generation
- any sheet where frame spacing might drift

Recommended 16-frame jump layout:

- `assets/hero/grids/sprite_reference_grid_16f_256_4x4.png`
- 4 rows by 4 columns
- one complete hero pose per cell
- row-major order from top-left to bottom-right
- a small grid inset during cleanup removes magenta borders cleanly

## Motion Prompt Requirements

### Run

A credible run must include contact/down-load, push-off, passing/high-knee
recovery, airborne/leg-spread, and the opposite contact. Include a brief flight
phase where both feet are off the ground.

For a 16-frame run, spell out a mirrored leg cycle:

1. plain far/left leg forward contact
2. left-leg down/load
3. left-leg push-off
4. embroidered right leg passing
5. embroidered right high knee, airborne
6. leg spread in air, right leg forward
7. embroidered right landing/contact
8. right-leg down/load
9. right-leg push-off
10. plain left leg passing
11. plain left high knee, airborne
12. leg spread in air, left leg forward
13. plain left landing/contact
14. left-leg down/load
15. left-leg push-off
16. airborne transition back to frame 1

### Jump

Jump should read as stable platformer motion, not constant limb flailing.

For a 16-frame jump:

- frames 1-6: anticipation and liftoff
- frames 3-6: blue-white wind jets at the feet
- frames 7-10: stable airborne/up/apex poses, only small changes
- frame 11: falling pose
- frames 12-16: landing and recovery
- frames 4-6 and 12-16: light dust puffs near the feet

## Canonical Cleanup Steps

All generated sources should pass through `tools/hero_run_sheet_pipeline.py`.

The script performs the important work:

- converts the source to RGBA
- removes flat `#00ff00` chroma pixels
- removes magenta layout guide pixels
- despills green antialiasing without eating turquoise staff caps
- removes tiny noise components
- extracts frames by connected components or by grid cells
- recenters each frame to `TARGET_CENTER_X=128`
- grounds each frame to `TARGET_GROUND_Y=220`
- scales consistently across the sheet
- writes a true horizontal `256 x 256` strip
- writes individual cleaned frames
- writes a checker/guide preview
- writes a validation JSON report

## Cleanup Modes

### Component Mode

Use this for separated horizontal strips where each frame is one connected
foreground component.

Example:

```bash
./.venv-image/bin/python tools/hero_run_sheet_pipeline.py \
  --source assets/hero/temp/<attempt>/raw/run_16f_raw.png \
  --frames 16 \
  --output assets/hero/temp/<attempt>/hero_new_run_sheet_16f.png \
  --preview assets/hero/temp/<attempt>/previews/run_16f_preview.png \
  --frames-dir assets/hero/temp/<attempt>/frames/run \
  --report assets/hero/temp/<attempt>/reports/run_16f_report.json \
  --split-mode components \
  --component-sort row-major \
  --component-min-area 1000 \
  --frame-prefix run
```

Use `--component-sort row-major` if the model returns two rows of poses. Use the
default `x` sort only for a true single horizontal strip.

### Grid Mode

Use this for guide-grid sources, multi-row sources, or effects that may become
separate components.

Example:

```bash
./.venv-image/bin/python tools/hero_run_sheet_pipeline.py \
  --source assets/hero/temp/<attempt>/raw/jump_16f_4x4_raw.png \
  --frames 16 \
  --output assets/hero/temp/<attempt>/hero_new_jump_sheet_16f.png \
  --preview assets/hero/temp/<attempt>/previews/jump_16f_preview.png \
  --frames-dir assets/hero/temp/<attempt>/frames/jump \
  --report assets/hero/temp/<attempt>/reports/jump_16f_report.json \
  --split-mode grid \
  --grid-cols 4 \
  --grid-rows 4 \
  --grid-inset 8 \
  --frame-prefix jump
```

Grid mode is the preferred path for jump because dust clouds and wind jets can
be disconnected from the character. Component mode would mistake those effects
for extra frames.

## Promotion Rules

Do not promote raw generated files directly into `assets/hero/`.

Promote only after:

- output size is exactly `frames * 256` by `256`
- validation status is `pass`
- no frame is empty
- no frame touches the final 256px cell edge
- preview shows correct order and no clipped staff/effects
- adjacent-frame warnings have been visually reviewed

Current promoted runtime files:

- `assets/hero/hero_new_run_sheet_256.png`
- `assets/hero/hero_new_jump_sheet_256.png`

When promoted sheets change, bump both:

- `HERO_SHEET_VERSION` in `script.js`
- the `script.js?v=...` query in `index.html`

If a frame's gameplay meaning changes, update timing/selection logic in
`script.js` at the same time. The jump sheet currently expects frames 1-6 for
liftoff, frame 11 for falling, and frames 12-16 for landing rather than being
played as a blind loop.

## Validation Rules

Hard fail:

- wrong frame count
- wrong final sheet size
- empty frame
- clipped final frame
- raw source cannot be segmented into the requested frames

Warnings to review:

- adjacent silhouette diff too low: duplicate-looking frames
- adjacent silhouette diff too high: motion pop
- high height/width variance: likely scale drift, staff drift, or pose mismatch
- source edge foreground: source was crowded before repack

Warnings are not automatic failures, but they must stay visible. Do not silently
ship weak generations.

## Deprecated Assumptions

These previous assumptions are no longer valid:

- "Generated sprite sheets can be used directly."
- "Equal slicing is safe for generated strips."
- "A transparent-looking model output means the asset is clean."
- "Separated dust/wind/spell components can be handled by component extraction."
- "Frame spacing in the raw image matters after cleanup."

The durable approach is: generate with chroma and spacing, then let the cleanup
pipeline isolate, remove background/guides, normalize size, center, ground,
preview, and validate.
