# 2D Animation Pipeline

Standalone sprite-sheet cleanup/repack pipeline extracted from the Terscha TD
hero animation work.

This folder is intentionally self-contained. Nothing here is imported by the
game, and no game files need to be moved or deleted. Use it as a separate
workspace for turning generated or third-party sprite sources into clean,
horizontal `256 x 256` animation strips.

## What It Does

The pipeline treats raw animation sources as pose sources, not final game
assets. It can:

- remove `#00ff00` chroma backgrounds
- remove magenta guide-grid pixels
- despill green edges without destroying turquoise staff/details
- remove tiny noise components
- extract frames by connected components, fixed grids, or equal slicing
- take the first N cells from a larger grid/atlas source
- normalize each frame into a transparent `256 x 256` cell
- center each sprite at `x=128`
- ground each sprite at `y=220`
- save individual frames, a horizontal strip, a preview sheet, and a JSON report

## Files

- `tools/animation_pipeline.py`: the standalone CLI.
- `docs/ANIMATION_PIPELINE_NOTES.md`: canonical workflow notes and prompt rules.
- `docs/QUICKSTART.md`: copy-paste commands for common workflows.
- `docs/PROMPT_RECIPES.md`: prompt blocks for generating cleanup-friendly sources.
- `docs/INTEGRATION_GUIDE.md`: notes for wiring outputs into a game.
- `assets/reference/`: current character reference images.
- `assets/grids/`: layout references for generation.
- `examples/sources/`: sample raw inputs copied from the game project.
- `examples/outputs/`: sample promoted outputs, previews, and validation reports.
- `examples/prompts/`: prompts used for the current generated run/jump attempts.

## Setup

From this folder:

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
```

You can also use any existing Python environment that has Pillow installed.

## Example: External 8x8 Run Sheet

`FancyOrkin-run.png` is an 8x8 transparent atlas. The game currently uses the
first 11 cells, row-major, repacked into a horizontal strip:

```bash
python tools/animation_pipeline.py \
  --source examples/sources/FancyOrkin-run.png \
  --frames 11 \
  --output work/run_11f_sheet_256.png \
  --preview work/run_11f_preview.png \
  --frames-dir work/frames/run \
  --report work/reports/run_11f_report.json \
  --split-mode grid \
  --grid-cols 8 \
  --grid-rows 8 \
  --take-first 11 \
  --frame-prefix run
```

## Example: Generated 4x4 Jump Grid

Use grid mode for jump, magic, dust, wind, or any sheet where effects may be
separate components:

```bash
python tools/animation_pipeline.py \
  --source examples/sources/jump_16f_4x4_raw.png \
  --frames 16 \
  --output work/jump_16f_sheet_256.png \
  --preview work/jump_16f_preview.png \
  --frames-dir work/frames/jump \
  --report work/reports/jump_16f_report.json \
  --split-mode grid \
  --grid-cols 4 \
  --grid-rows 4 \
  --grid-inset 8 \
  --frame-prefix jump
```

## Example: Generated Separated Pose Strip

Use component mode when each frame is one connected foreground component on a
flat chroma background:

```bash
python tools/animation_pipeline.py \
  --source work/raw/run_16f_raw.png \
  --frames 16 \
  --output work/run_16f_sheet_256.png \
  --preview work/run_16f_preview.png \
  --frames-dir work/frames/run \
  --report work/reports/run_16f_report.json \
  --split-mode components \
  --component-sort row-major \
  --component-min-area 1000 \
  --frame-prefix run
```

## Promotion Checklist

Only promote the output sheet after:

- validation status is `pass`
- output size is exactly `frames * 256` by `256`
- preview order is correct
- no staff/effect is clipped
- duplicate/pop warnings are reviewed
- gameplay timing is updated in the consuming game if frame meanings changed

The consuming game should align the sprite's visible ground line to the same
`TARGET_GROUND_Y` used here, currently `220`.
