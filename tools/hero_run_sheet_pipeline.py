from __future__ import annotations

import argparse
import json
import math
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


"""
Canonical cleaner/repacker for generated hero animation sources.

Raw image-generation output is never a finished game sheet. It is a rough pose
source that must be normalized here before promotion into assets/hero.

Supported source layouts:
- components: separated foreground poses on flat #00ff00, sorted by x or
  row-major if the model returned multiple rows.
- grid: fixed row/column guide layouts, useful when dust, wind, or magic effects
  are disconnected from the character and would confuse component extraction.
- equal: last-resort slicing for truly guaranteed horizontal cells.

The pipeline removes chroma and magenta guide pixels, despills green edges while
preserving turquoise staff caps, removes tiny noise, recenters/grounds each
frame into a true 256px cell, writes preview artifacts, and reports validation
warnings for duplicates, motion pops, scale drift, and clipping.

See assets/hero/reference/ANIMATION_PIPELINE_NOTES.md for the full canonical
workflow. That document overrides earlier hero animation pipeline assumptions.
"""


FRAME_SIZE = 256
TARGET_CENTER_X = 128
TARGET_GROUND_Y = 220
SIDE_MARGIN = 2
TOP_MARGIN = 2
BOTTOM_MARGIN = 2
MIN_COMPONENT_AREA = 32


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def parse_hex_color(value: str) -> tuple[int, int, int]:
    raw = value.strip().lstrip("#")
    if len(raw) != 6:
        raise ValueError(f"Expected 6-digit hex color, got {value!r}")
    return int(raw[:2], 16), int(raw[2:4], 16), int(raw[4:], 16)


def is_chroma(rgb: tuple[int, int, int], key: tuple[int, int, int], tolerance: int) -> bool:
    r, g, b = rgb
    if color_distance(rgb, key) <= tolerance:
        return True
    key_is_green = key[1] > 200 and key[0] < 80 and key[2] < 80
    if key_is_green:
        return g >= 170 and r <= 120 and b <= 130 and g >= r + 70 and g >= b + 55
    return False


def is_layout_guide(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r >= 190 and b >= 190 and g <= 90


def remove_chroma_background(img: Image.Image, key: tuple[int, int, int], tolerance: int) -> Image.Image:
    rgba = img.convert("RGBA")
    px = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if is_chroma((r, g, b), key, tolerance) or is_layout_guide((r, g, b)):
                px[x, y] = (0, 0, 0, 0)
                continue
            # Soft despill for chroma-edge pixels without eating cyan staff tips.
            if key[1] > 200 and g > r + 35 and g > b + 18 and r < 150 and b < 180:
                px[x, y] = (r, min(g, max(r, b) + 24), b, a)
    return rgba


def component_bboxes(img: Image.Image) -> list[dict[str, object]]:
    rgba = img.convert("RGBA")
    width, height = rgba.size
    alpha = rgba.getchannel("A")
    a_px = alpha.load()
    visited = bytearray(width * height)
    components: list[dict[str, object]] = []

    def index(x: int, y: int) -> int:
        return y * width + x

    for y in range(height):
        for x in range(width):
            idx = index(x, y)
            if visited[idx] or a_px[x, y] == 0:
                continue
            visited[idx] = 1
            queue: deque[tuple[int, int]] = deque([(x, y)])
            pixels: list[tuple[int, int]] = [(x, y)]
            min_x = max_x = x
            min_y = max_y = y
            while queue:
                cx, cy = queue.popleft()
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    nidx = index(nx, ny)
                    if visited[nidx] or a_px[nx, ny] == 0:
                        continue
                    visited[nidx] = 1
                    queue.append((nx, ny))
                    pixels.append((nx, ny))
            components.append(
                {
                    "area": len(pixels),
                    "bbox": (min_x, min_y, max_x + 1, max_y + 1),
                    "pixels": pixels,
                }
            )
    return components


def remove_noise(img: Image.Image, min_area: int = MIN_COMPONENT_AREA) -> Image.Image:
    rgba = img.convert("RGBA")
    out = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    out_px = out.load()
    in_px = rgba.load()
    for comp in component_bboxes(rgba):
        if int(comp["area"]) < min_area:
            continue
        for x, y in comp["pixels"]:  # type: ignore[index]
            out_px[x, y] = in_px[x, y]
    return out


def union_box(boxes: list[tuple[int, int, int, int]]) -> tuple[int, int, int, int]:
    return (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )


def foreground_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    components = [
        comp for comp in component_bboxes(img)
        if int(comp["area"]) >= MIN_COMPONENT_AREA
    ]
    if not components:
        bbox = img.getbbox()
        if not bbox:
            raise ValueError("Frame has no foreground after cleanup")
        return bbox
    largest_area = max(int(comp["area"]) for comp in components)
    kept = [
        comp["bbox"] for comp in components
        if int(comp["area"]) >= max(MIN_COMPONENT_AREA, int(largest_area * 0.018))
    ]
    return union_box(kept)  # type: ignore[arg-type]


def split_equal_cells(img: Image.Image, frame_count: int) -> list[Image.Image]:
    width, height = img.size
    return [
        img.crop((round(i * width / frame_count), 0, round((i + 1) * width / frame_count), height))
        for i in range(frame_count)
    ]


def split_grid_cells(img: Image.Image, cols: int, rows: int, inset: int = 0) -> list[Image.Image]:
    width, height = img.size
    cells: list[Image.Image] = []
    for row in range(rows):
        for col in range(cols):
            cells.append(
                img.crop(
                    (
                        round(col * width / cols) + inset,
                        round(row * height / rows) + inset,
                        round((col + 1) * width / cols) - inset,
                        round((row + 1) * height / rows) - inset,
                    )
                )
            )
    return cells


def component_center(comp: dict[str, object]) -> tuple[float, float]:
    x0, y0, x1, y1 = comp["bbox"]  # type: ignore[assignment]
    return (x0 + x1) / 2, (y0 + y1) / 2


def sort_components_row_major(components: list[dict[str, object]]) -> list[dict[str, object]]:
    if not components:
        return []
    heights = [comp["bbox"][3] - comp["bbox"][1] for comp in components]  # type: ignore[index]
    row_threshold = max(24.0, sorted(heights)[len(heights) // 2] * 0.72)
    rows: list[list[dict[str, object]]] = []
    for comp in sorted(components, key=lambda item: component_center(item)[1]):
        _, cy = component_center(comp)
        for row in rows:
            row_cy = sum(component_center(item)[1] for item in row) / len(row)
            if abs(cy - row_cy) <= row_threshold:
                row.append(comp)
                break
        else:
            rows.append([comp])
    ordered: list[dict[str, object]] = []
    for row in sorted(rows, key=lambda items: sum(component_center(item)[1] for item in items) / len(items)):
        ordered.extend(sorted(row, key=lambda item: component_center(item)[0]))
    return ordered


def split_component_cells(
    img: Image.Image,
    frame_count: int,
    pad: int = 8,
    min_area: int = MIN_COMPONENT_AREA * 8,
    sort_order: str = "x",
) -> list[Image.Image]:
    components = [
        comp for comp in component_bboxes(img)
        if int(comp["area"]) >= min_area
    ]
    if len(components) != frame_count:
        raise ValueError(f"Expected {frame_count} foreground components, found {len(components)}")

    width, height = img.size
    in_px = img.load()
    cells: list[Image.Image] = []
    if sort_order == "row-major":
        ordered_components = sort_components_row_major(components)
    else:
        ordered_components = sorted(components, key=lambda item: component_center(item)[0])

    for comp in ordered_components:
        x0, y0, x1, y1 = comp["bbox"]  # type: ignore[assignment]
        cell_x0 = max(0, x0 - pad)
        cell_y0 = max(0, y0 - pad)
        cell_x1 = min(width, x1 + pad)
        cell_y1 = min(height, y1 + pad)
        cell = Image.new("RGBA", (cell_x1 - cell_x0, cell_y1 - cell_y0), (0, 0, 0, 0))
        cell_px = cell.load()
        for x, y in comp["pixels"]:  # type: ignore[index]
            cell_px[x - cell_x0, y - cell_y0] = in_px[x, y]
        cells.append(cell)
    return cells


def alpha_edge_counts(img: Image.Image) -> dict[str, int]:
    alpha = img.getchannel("A")
    width, height = alpha.size
    px = alpha.load()
    return {
        "left": sum(1 for y in range(height) if px[0, y] > 0),
        "right": sum(1 for y in range(height) if px[width - 1, y] > 0),
        "top": sum(1 for x in range(width) if px[x, 0] > 0),
        "bottom": sum(1 for x in range(width) if px[x, height - 1] > 0),
    }


def silhouette_difference(a: Image.Image, b: Image.Image) -> float:
    aa = a.getchannel("A").point(lambda value: 255 if value > 20 else 0)
    bb = b.getchannel("A").point(lambda value: 255 if value > 20 else 0)
    width, height = aa.size
    apx = aa.load()
    bpx = bb.load()
    changed = 0
    total = 0
    for y in range(height):
        for x in range(width):
            av = apx[x, y] > 0
            bv = bpx[x, y] > 0
            total += int(av or bv)
            changed += int(av != bv)
    return changed / max(1, total)


def layout_frames(cells: list[Image.Image]) -> tuple[list[Image.Image], list[dict[str, object]], float]:
    crops: list[dict[str, object]] = []
    for cell in cells:
        cleaned = remove_noise(cell)
        bbox = foreground_bbox(cleaned)
        crop = cleaned.crop(bbox)
        anchor_x = (bbox[0] + bbox[2]) / 2
        anchor_y = bbox[3]
        crops.append({"image": cleaned, "bbox": bbox, "crop": crop, "anchor_x": anchor_x, "anchor_y": anchor_y})

    max_scale = 99.0
    for record in crops:
        bbox = record["bbox"]  # type: ignore[assignment]
        anchor_x = float(record["anchor_x"])
        anchor_y = float(record["anchor_y"])
        left = anchor_x - bbox[0]
        right = bbox[2] - anchor_x
        top = anchor_y - bbox[1]
        bottom = bbox[3] - anchor_y
        max_scale = min(
            max_scale,
            (TARGET_CENTER_X - SIDE_MARGIN) / max(1.0, left),
            (FRAME_SIZE - TARGET_CENTER_X - SIDE_MARGIN) / max(1.0, right),
            (TARGET_GROUND_Y - TOP_MARGIN) / max(1.0, top),
            (FRAME_SIZE - TARGET_GROUND_Y - BOTTOM_MARGIN) / max(1.0, bottom),
        )
    scale = min(1.0, max(0.05, max_scale * 0.98))

    frames: list[Image.Image] = []
    records: list[dict[str, object]] = []
    for index, record in enumerate(crops):
        crop = record["crop"]  # type: ignore[assignment]
        bbox = record["bbox"]  # type: ignore[assignment]
        anchor_x = float(record["anchor_x"])
        anchor_y = float(record["anchor_y"])
        scaled = crop.resize(
            (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
            Image.Resampling.LANCZOS,
        )
        anchor_in_crop_x = (anchor_x - bbox[0]) * scale
        anchor_in_crop_y = (anchor_y - bbox[1]) * scale
        paste_x = round(TARGET_CENTER_X - anchor_in_crop_x)
        paste_y = round(TARGET_GROUND_Y - anchor_in_crop_y)
        canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(scaled, (paste_x, paste_y))
        canvas = remove_noise(canvas)
        final_bbox = canvas.getbbox()
        if not final_bbox:
            raise ValueError(f"Frame {index + 1} is empty after layout")
        frames.append(canvas)
        records.append(
            {
                "index": index + 1,
                "source_bbox": list(bbox),
                "final_bbox": list(final_bbox),
                "source_edge_alpha": alpha_edge_counts(record["image"]),  # type: ignore[arg-type]
            }
        )
    return frames, records, scale


def save_sheet(frames: list[Image.Image], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (FRAME_SIZE * len(frames), FRAME_SIZE), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME_SIZE, 0))
    sheet.save(output)


def save_preview(frames: list[Image.Image], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (FRAME_SIZE * len(frames), FRAME_SIZE), (42, 45, 50, 255))
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        x0 = index * FRAME_SIZE
        for y in range(0, FRAME_SIZE, 32):
            for x in range(x0, x0 + FRAME_SIZE, 32):
                fill = (50, 54, 60, 255) if ((x // 32 + y // 32) % 2) else (36, 39, 44, 255)
                draw.rectangle((x, y, min(x + 31, x0 + FRAME_SIZE - 1), min(y + 31, FRAME_SIZE - 1)), fill=fill)
        draw.line((x0, TARGET_GROUND_Y, x0 + FRAME_SIZE - 1, TARGET_GROUND_Y), fill=(120, 180, 140, 150))
        draw.line((x0 + TARGET_CENTER_X, 0, x0 + TARGET_CENTER_X, FRAME_SIZE - 1), fill=(120, 160, 220, 90))
        sheet.alpha_composite(frame, (x0, 0))
        draw.rectangle((x0, 0, x0 + FRAME_SIZE - 1, FRAME_SIZE - 1), outline=(255, 255, 255, 100))
    sheet.save(output)


def validate(frames: list[Image.Image], records: list[dict[str, object]], scale: float) -> dict[str, object]:
    errors: list[str] = []
    warnings: list[str] = []
    bboxes = []
    alpha_ratios = []
    for index, frame in enumerate(frames):
        bbox = frame.getbbox()
        if not bbox:
            errors.append(f"Frame {index + 1} is empty")
            continue
        bboxes.append(bbox)
        if bbox[0] <= 0 or bbox[1] <= 0 or bbox[2] >= FRAME_SIZE or bbox[3] >= FRAME_SIZE:
            errors.append(f"Frame {index + 1} touches the 256px cell edge: bbox={bbox}")
        zero_ratio = frame.getchannel("A").histogram()[0] / (FRAME_SIZE * FRAME_SIZE)
        alpha_ratios.append(zero_ratio)
        if zero_ratio < 0.35:
            warnings.append(f"Frame {index + 1} is visually crowded in cell: transparent ratio={zero_ratio:.3f}")
        edge_counts = records[index]["source_edge_alpha"]  # type: ignore[index]
        for side, count in edge_counts.items():  # type: ignore[union-attr]
            if int(count) > 2:
                warnings.append(f"Source frame {index + 1} has foreground on {side} edge before repack ({count}px)")

    diffs = [
        silhouette_difference(frames[i], frames[(i + 1) % len(frames)])
        for i in range(len(frames))
    ]
    if diffs:
        for index, diff in enumerate(diffs):
            if diff < 0.12:
                warnings.append(f"Frames {index + 1}->{(index + 1) % len(frames) + 1} may be too similar: diff={diff:.3f}")
            if diff > 0.58:
                warnings.append(f"Frames {index + 1}->{(index + 1) % len(frames) + 1} may pop: diff={diff:.3f}")
    if bboxes:
        heights = [box[3] - box[1] for box in bboxes]
        widths = [box[2] - box[0] for box in bboxes]
        if max(heights) / max(1, min(heights)) > 1.35:
            warnings.append("Frame height variance is high; review pose consistency.")
        if max(widths) / max(1, min(widths)) > 1.55:
            warnings.append("Frame width variance is high; long staff or stride may cause scale/readability issues.")
    return {
        "status": "fail" if errors else "pass",
        "errors": errors,
        "warnings": warnings,
        "scale": round(scale, 6),
        "adjacent_silhouette_diffs": [round(value, 4) for value in diffs],
        "alpha_zero_ratio_avg": round(sum(alpha_ratios) / max(1, len(alpha_ratios)), 4),
        "frames": records,
    }


def run(args: argparse.Namespace) -> dict[str, object]:
    source = Path(args.source)
    key = parse_hex_color(args.key)
    img = Image.open(source).convert("RGBA")
    cleaned = remove_chroma_background(img, key, args.tolerance)
    if args.split_mode == "components":
        cells = split_component_cells(
            cleaned,
            args.frames,
            min_area=args.component_min_area,
            sort_order=args.component_sort,
        )
    elif args.split_mode == "grid":
        if args.grid_cols * args.grid_rows != args.frames:
            raise ValueError("--grid-cols * --grid-rows must equal --frames")
        cells = split_grid_cells(cleaned, args.grid_cols, args.grid_rows, args.grid_inset)
    else:
        cells = split_equal_cells(cleaned, args.frames)
    frames, records, scale = layout_frames(cells)
    output = Path(args.output)
    preview = Path(args.preview)
    frames_dir = Path(args.frames_dir)
    frames_dir.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames, start=1):
        frame.save(frames_dir / f"{args.frame_prefix}_{index:02d}.png")
    save_sheet(frames, output)
    save_preview(frames, preview)
    report = validate(frames, records, scale)
    report.update(
        {
            "source": str(source),
            "output": str(output),
            "preview": str(preview),
            "frames_dir": str(frames_dir),
            "frame_count": args.frames,
            "frame_size": FRAME_SIZE,
            "sheet_size": [FRAME_SIZE * args.frames, FRAME_SIZE],
        }
    )
    Path(args.report).write_text(json.dumps(report, indent=2))
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean, repack, and validate generated hero animation sources.")
    parser.add_argument("--source", required=True)
    parser.add_argument("--frames", type=int, default=10)
    parser.add_argument("--output", required=True)
    parser.add_argument("--preview", required=True)
    parser.add_argument("--frames-dir", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--key", default="#00ff00")
    parser.add_argument("--tolerance", type=int, default=70)
    parser.add_argument("--split-mode", choices=("components", "equal", "grid"), default="components")
    parser.add_argument("--grid-cols", type=int, default=1)
    parser.add_argument("--grid-rows", type=int, default=1)
    parser.add_argument("--grid-inset", type=int, default=0)
    parser.add_argument("--component-sort", choices=("x", "row-major"), default="x")
    parser.add_argument("--component-min-area", type=int, default=MIN_COMPONENT_AREA * 8)
    parser.add_argument("--frame-prefix", default="run")
    args = parser.parse_args()
    print(json.dumps(run(args), indent=2))


if __name__ == "__main__":
    main()
