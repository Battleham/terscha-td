# Prompt Recipes

These prompts are designed to produce cleanup-friendly sources, not final game
sheets. The cleanup pipeline handles transparency, frame spacing, scale, center,
and ground alignment.

## Universal Rules

Include these in every image-generation prompt:

```text
Create animation source art for cleanup, not a finished sprite sheet.
Use a perfectly flat solid #00ff00 chroma-key background.
No floor plane, no cast shadow, no checkerboard, no gradient, no labels, no text, no watermark.
Keep the full character, weapon, cloth, and effects inside each frame with generous padding.
Do not use #00ff00 in the character or effects.
```

## Character Consistency Block

Use when preserving the current reference character:

```text
Preserve this exact character identity in every frame: bald head, black beard,
muscular shirtless torso, black shoulder tattoo, white forearm wraps, purple
sash with trailing cloth, loose dark blue pants, sandals, long wooden staff with
turquoise-and-gold caps. Preserve the asymmetrical pants: the camera-near/right
leg has ornate gold embroidery; the far/left leg is plain with no embroidery.
```

## 16-Frame Run

```text
Create a clean 16-frame run animation source sheet, facing right, full body
visible in every frame. One separated pose per frame, consistent camera angle
and scale.

The run must include contact/down-load, push-off, passing/high-knee recovery,
airborne/leg-spread, and the opposite contact. Include a brief flight phase
where both feet are off the ground.

Frame plan:
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
```

## 16-Frame Jump In 4x4 Grid

Use `assets/grids/sprite_reference_grid_16f_256_4x4.png` as the layout reference.

```text
Create a 16-frame jump animation source in a 4x4 grid, row-major order from
top-left to bottom-right. Exactly one complete character pose in every cell.
Do not leave dust-only, wind-only, empty, or staff-only cells. Nothing crosses a
cell border.

Jump intent: platformer jump with stable readable midair pose. Most midair
frames are very similar; only liftoff and landing change strongly.

Frame plan:
1. grounded crouch anticipation
2. deeper crouch
3. start liftoff, small blue-white wind jets
4. strong liftoff, clear wind jets, tiny dust puffs
5. leaving ground, stronger downward wind jets
6. final liftoff, jets taper, dust expands
7. airborne going up, stable tuck
8. airborne going up, almost same as frame 7
9. apex/float, very similar to frames 7-8
10. airborne hover/down transition, still stable
11. falling pose
12. feet near ground, small dust begins
13. landing contact, knees bend, dust around sandals
14. landing squash, bigger dust cloud
15. recovery from landing, dust fading
16. ready stance after landing

Wind jets only in frames 3-6. Dust only in frames 4-6 and 12-16.
```

## When To Prefer Grid Prompts

Prefer a grid source when:

- effects can detach from the character
- the model may output multiple rows
- you need fixed row-major frame order
- frame spacing matters less than clean cell slicing

Prefer a separated horizontal strip when:

- every frame is one connected character component
- there are no separate dust, wind, spell, projectile, or debris pieces
