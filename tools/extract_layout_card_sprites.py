from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


INPUTS = [
    {
        "name": "run",
        "frames": 8,
        "path": "/Users/yuriysrybnik/.codex/generated_images/019db1c9-1222-7fe2-aad8-20b8079a0198/ig_0cada7b5db6860ec0169e7ecdf554481988a9b42c946e30fd8.png",
    },
    {
        "name": "idle",
        "frames": 6,
        "path": "/Users/yuriysrybnik/.codex/generated_images/019db1c9-1222-7fe2-aad8-20b8079a0198/ig_0cada7b5db6860ec0169e7ed440a788198a2fb68aba8bf73e1.png",
    },
    {
        "name": "jump",
        "frames": 12,
        "path": "/Users/yuriysrybnik/.codex/generated_images/019db1c9-1222-7fe2-aad8-20b8079a0198/ig_0cada7b5db6860ec0169e7ed834b948198b2710d45082e2c62.png",
    },
]

OUTPUT_DIR = Path("/Users/yuriysrybnik/Documents/New project/assets/generated/monk/layout_card_clean")
GUIDE_TOLERANCE = 24
PAD = 6


def color_close(rgb: tuple[int, int, int], target: tuple[int, int, int], tol: int = GUIDE_TOLERANCE) -> bool:
    return all(abs(a - b) <= tol for a, b in zip(rgb, target))


def is_magenta(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r >= 170 and b >= 120 and g <= 140 and (r + b) - g >= 260


def is_guide(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    is_green_bg = g >= 180 and r <= 90 and b <= 110
    is_magenta_like = r >= 170 and b >= 120 and g <= 150
    is_cyan_like = g >= 150 and b >= 150 and r <= 120
    is_orange_like = r >= 180 and 80 <= g <= 220 and b <= 120
    is_white_like = r >= 220 and g >= 220 and b >= 220
    return is_green_bg or is_magenta_like or is_cyan_like or is_orange_like or is_white_like


def find_groups(values: list[int]) -> list[tuple[int, int]]:
    if not values:
        return []
    groups: list[tuple[int, int]] = []
    start = prev = values[0]
    for value in values[1:]:
        if value <= prev + 1:
            prev = value
            continue
        groups.append((start, prev))
        start = prev = value
    groups.append((start, prev))
    return groups


def detect_guide_bounds(img: Image.Image) -> tuple[int, int, int, int]:
    width, height = img.size
    pixels = img.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(height):
        for x in range(width):
            if is_magenta(pixels[x, y][:3]):
                xs.append(x)
                ys.append(y)
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def extract_columns(crop: Image.Image, frames: int) -> list[tuple[int, int]]:
    width, height = crop.size
    pixels = crop.load()
    magenta_cols = []
    threshold = max(6, height // 20)
    for x in range(width):
        count = sum(1 for y in range(height) if is_magenta(pixels[x, y][:3]))
        if count >= threshold:
            magenta_cols.append(x)
    groups = find_groups(magenta_cols)
    if len(groups) < 2:
        counts = [
            (x, sum(1 for y in range(height) if is_magenta(pixels[x, y][:3])))
            for x in range(width)
        ]
        strongest = sorted(counts, key=lambda item: item[1], reverse=True)
        picked: list[int] = []
        min_spacing = max(10, width // (frames * 3))
        for x, count in strongest:
            if count < 2:
                continue
            if all(abs(x - existing) > min_spacing for existing in picked):
                picked.append(x)
            if len(picked) == frames + 1:
                break
        if len(picked) < frames + 1:
            raise ValueError(f"Expected at least {frames + 1} frame boundaries, found {len(groups)}")
        boundaries = sorted(picked)
    else:
        centers = [round((start + end) / 2) for start, end in groups]
        approx = width / frames
        boundaries = []
        for i in range(frames + 1):
            target = round(i * approx)
            boundary = min(centers, key=lambda center: abs(center - target))
            boundaries.append(boundary)
        deduped = [boundaries[0]]
        min_spacing = max(8, int(approx * 0.35))
        for boundary in boundaries[1:]:
            if boundary - deduped[-1] < min_spacing:
                deduped.append(deduped[-1] + round(approx))
            else:
                deduped.append(boundary)
        boundaries = deduped
    return [(boundaries[i], boundaries[i + 1]) for i in range(frames)]


def strip_guides(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            if is_guide(pixels[x, y][:3]):
                pixels[x, y] = (0, 0, 0, 0)
                continue
            r, g, b, a = pixels[x, y]
            if not a:
                continue
            strong_cyan_line = r <= 45 and g >= 185 and b >= 185
            strong_yellow_line = r >= 185 and g >= 130 and b <= 55
            strong_green_bg = g >= 200 and r <= 50 and b <= 60
            if strong_cyan_line or strong_yellow_line or strong_green_bg:
                pixels[x, y] = (0, 0, 0, 0)
    border = 8
    for y in range(height):
        for x in range(width):
            if border <= x < width - border and border <= y < height - border:
                continue
            r, g, b, a = pixels[x, y]
            if not a:
                continue
            edge_guide = (
                (g >= 110 and b >= 110 and r <= 140)
                or (r >= 150 and b >= 100 and g <= 170)
                or (r >= 160 and g >= 90 and b <= 140)
            )
            if edge_guide:
                pixels[x, y] = (0, 0, 0, 0)
    bbox = rgba.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def build_sheet(name: str, source: Path, frames: int) -> dict[str, str | int]:
    img = Image.open(source).convert("RGBA")
    gx0, gy0, gx1, gy1 = detect_guide_bounds(img)
    guide_crop = img.crop((gx0, gy0, gx1, gy1))
    columns = extract_columns(guide_crop, frames)

    frame_images = []
    for left, right in columns:
        cell = guide_crop.crop((left + PAD, PAD, right - PAD, guide_crop.height - PAD))
        frame_images.append(strip_guides(cell))

    cell_w = max(frame.width for frame in frame_images)
    cell_h = max(frame.height for frame in frame_images)
    sheet = Image.new("RGBA", (cell_w * frames, cell_h), (0, 0, 0, 0))
    frames_dir = OUTPUT_DIR / f"{name}_frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    for index, frame in enumerate(frame_images):
        x = index * cell_w + (cell_w - frame.width) // 2
        y = cell_h - frame.height
        sheet.alpha_composite(frame, (x, y))
        frame.save(frames_dir / f"{name}_{index + 1:02d}.png")

    out_path = OUTPUT_DIR / f"monk_{name}_sheet_gridclean.png"
    sheet.save(out_path)
    return {
        "name": name,
        "source": str(source),
        "output": str(out_path),
        "frame_count": frames,
        "cell_width": cell_w,
        "cell_height": cell_h,
        "sheet_width": sheet.width,
        "sheet_height": sheet.height,
        "frames_dir": str(frames_dir),
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = [build_sheet(item["name"], Path(item["path"]), item["frames"]) for item in INPUTS]
    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
