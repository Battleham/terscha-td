# Prompt Variants Used

## Candidate A
Use case: stylized-concept
Asset type: animation sprite-sheet spreadsheet source, sprint run cycle
Primary request: Generate a new 10-frame sprint cycle from the provided character reference. This is animation production art: frame-to-frame motion must be continuous, and frame 10 must loop cleanly to frame 1.
Input images: Image 1 = character reference. Image 2 = 10-frame reference grid.
Style/medium: preserve identical character design and proportions in every frame.
Composition/framing: one horizontal strip with exactly 10 equal cells, one full-body pose per cell, facing right in all frames, generous spacing between poses, no clipping.
Constraints: sprint in place with consistent speed and cadence; clear pose contrast per half-cycle using contact -> down (lowest compression) -> push -> peak (highest airborne), then repeat on opposite side. Alternate support leg cleanly. Keep center and ground alignment consistent with the reference grid.
Avoid: repeated near-identical neighboring poses, disconnected leg mechanics, random jumps, proportion drift, weapon drift, perspective flips, extra limbs, text, logos, watermark.

## Candidate B
Use case: stylized-concept
Asset type: animation sprite-sheet spreadsheet source, sprint run cycle
Primary request: Generate a fresh 10-frame sprint-in-place cycle from the provided character reference. The strip must read as one continuous motion path, and frame 10 must transition cleanly into frame 1.
Input images: Image 1 = character reference. Image 2 = 10-frame reference grid.
Style/medium: keep character identity and proportions fully consistent across all frames.
Composition/framing: one horizontal strip, exactly 10 equal cells, one full-body pose per cell, facing right, generous spacing, no clipping.
Constraints: maintain constant sprint tempo and athletic form with pumping arms. Use distinct key poses per side: contact, down compression (lowest), push, peak flight (highest), then mirror on opposite side. Adjacent frames must not be near-duplicates. Keep center and ground alignment consistent with the grid.
Avoid: disconnected frame jumps, foot/leg popping, repeated same-pose neighbors, design drift, weapon drift, extra limbs, text, logos, watermark.

## Candidate C
Use case: stylized-concept
Asset type: animation sprite-sheet spreadsheet source, sprint run cycle
Primary request: Create a new 10-frame sprint-in-place loop from the provided character reference. The sequence must animate smoothly across frames and loop seamlessly from frame 10 back to frame 1.
Input images: Image 1 = character reference. Image 2 = 10-frame reference grid.
Style/medium: keep one consistent character model in all frames.
Composition/framing: one horizontal 10-cell strip, equal cell widths, one full-body pose per cell, facing right, generous spacing, no clipping.
Constraints: maintain even cadence and clear leg progression with no pose repeats. Build two mirrored half-cycles with visible contact, compression, push-off, and flight contrast. Keep support-foot changes clean and timing readable for gameplay.
Constraints: keep center and baseline alignment consistent with the grid.
Avoid: adjacent duplicate poses, disconnected mechanics, random hops, shape drift, weapon drift, extra limbs, perspective flips, text, logos, watermark.
