# Codex Image Generation Notes

## Sprite Workflow Rules (Persistent)

1. Always use the `imagegen` skill for raster sprite generation/editing tasks.
2. Always use a structured prompt (use-case + asset type + primary request + constraints + avoid list).
3. For sprite sheets, generate or provide a programmatic reference grid first and explicitly constrain one pose per cell.
4. Require transparent background in prompt and validate alpha channel after generation.
5. After generation, run postprocessing/validation:
   - remove checker/neutral baked backgrounds
   - verify no frame-edge clipping
   - verify design consistency across animations (silhouette, outfit, weapon/staff)
6. If model output violates grid/cell constraints, do not force equal slicing; use content-aware boundary detection or regenerate with stronger spacing constraints.

