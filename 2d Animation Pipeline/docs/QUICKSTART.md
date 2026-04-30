# Quickstart

Use this when you just need to turn a source sheet into a clean horizontal
`256 x 256` sprite strip.

## Setup

From `2d Animation Pipeline`:

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
```

Use `./.venv/bin/python` in the commands below after setup.

## External Atlas To Horizontal Strip

Use this for an already-transparent atlas such as `FancyOrkin-run.png`.

```bash
python tools/animation_pipeline.py \
  --source examples/sources/FancyOrkin-run.png \
  --frames 11 \
  --output work/run_11f_sheet_256.png \
  --preview work/previews/run_11f_preview.png \
  --frames-dir work/frames/run \
  --report work/reports/run_11f_report.json \
  --split-mode grid \
  --grid-cols 8 \
  --grid-rows 8 \
  --take-first 11 \
  --frame-prefix run
```

## Generated 4x4 Grid To Horizontal Strip

Use this for jump/magic/effects where dust, wind, or spell parts may be detached
from the character.

```bash
python tools/animation_pipeline.py \
  --source examples/sources/jump_16f_4x4_raw.png \
  --frames 16 \
  --output work/jump_16f_sheet_256.png \
  --preview work/previews/jump_16f_preview.png \
  --frames-dir work/frames/jump \
  --report work/reports/jump_16f_report.json \
  --split-mode grid \
  --grid-cols 4 \
  --grid-rows 4 \
  --grid-inset 8 \
  --frame-prefix jump
```

## Generated Separated Pose Strip

Use this when each frame is one connected character component on a flat
`#00ff00` background.

```bash
python tools/animation_pipeline.py \
  --source work/raw/run_16f_raw.png \
  --frames 16 \
  --output work/run_16f_sheet_256.png \
  --preview work/previews/run_16f_preview.png \
  --frames-dir work/frames/run \
  --report work/reports/run_16f_report.json \
  --split-mode components \
  --component-sort row-major \
  --component-min-area 1000 \
  --frame-prefix run
```

## Read The Output

Check these files before promotion:

- output sheet: final horizontal PNG for the game
- preview PNG: visual order, clipping, scale, and ground-line check
- individual frames: precise frame inspection
- report JSON: pass/fail, warnings, silhouette diffs, frame boxes

Warnings are not automatic failures. They mean inspect before shipping.
