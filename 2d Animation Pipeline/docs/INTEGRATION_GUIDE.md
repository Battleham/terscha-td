# Game Integration Guide

Use this after the pipeline creates a cleaned horizontal sprite sheet.

## Output Assumptions

Pipeline outputs are horizontal strips:

- frame width: `256`
- frame height: `256`
- visible sprite ground line: `TARGET_GROUND_Y = 220`
- center line: `TARGET_CENTER_X = 128`
- transparent background

The consuming game should draw each frame so the sprite's internal ground line
lands on the character's physics feet. Do not align the bottom of the full
transparent 256px cell to the ground, or the character will appear to float.

## Canvas Draw Formula

For a `256 x 256` frame:

```js
const spriteGroundY = 220;
const spriteGroundRatio = spriteGroundY / frameHeight;
const drawX = actorCenterX - renderWidth / 2;
const drawY = actorFeetY - renderHeight * spriteGroundRatio;
```

Then draw the animation at `drawX`, `drawY`, `renderWidth`, `renderHeight`.

## Frame Count And FPS

Cycle duration is:

```text
durationSeconds = frameCount / fps
```

If you remove frames but keep the same FPS, the visual cycle gets faster.

Example:

```text
12 frames at 16.2 fps = 0.74s
11 frames at 16.2 fps = 0.68s
```

To keep the old duration after dropping from 12 to 11 frames:

```text
newFps = oldFps * 11 / 12
```

## Promotion Checklist

Before copying an output into a game:

- Preview the sheet and animated GIF if available.
- Confirm the JSON report `status` is `pass`.
- Review duplicate-frame warnings.
- Review motion-pop warnings.
- Check that the visual feet sit on the preview ground line.
- Update animation `frameWidth`, `frameHeight`, and `fps`.
- Update cache-busting query strings if the game uses them.
- Update special frame logic if gameplay depends on frame numbers.

## Jump Frame Meaning

The current 16-frame jump example uses:

- frames 1-6: anticipation and liftoff
- frames 7-10: stable air/up/apex frames
- frame 11: falling
- frames 12-16: landing and recovery

If the game selects jump frames manually based on velocity, keep that mapping in
sync with the sheet.
