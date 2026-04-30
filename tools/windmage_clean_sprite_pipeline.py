from __future__ import annotations

import json
import math
from collections import Counter, deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


FRAME_SIZE = 256
MARGIN = 8
SAFETY_PAD = 2
TARGET_CENTER_X = FRAME_SIZE // 2
TARGET_GROUND_Y = 217
TOP_MARGIN = 8
SIDE_MARGIN = 6
BOTTOM_MARGIN = 6
MAGENTA_MIN_R = 200
MAGENTA_MAX_G = 190
MAGENTA_MIN_B = 200
BACKGROUND_TOLERANCE = 30
MIN_COMPONENT_AREA = 28


@dataclass(frozen=True)
class AnimationSpec:
    name: str
    frames: int
    source: Path
    output: Path
    ms_per_frame: int
    loop: bool
    event_frame: int | None = None
    event_name: str | None = None


ANIMATIONS = [
    AnimationSpec(
        name="idle",
        frames=8,
        source=Path(
            "/Users/yuriysrybnik/.codex/generated_images/019db5c4-1098-7032-82d0-039d4d89f5b1/"
            "ig_0ad07495f54be4e70169e8f269a12c819bbc23320a82e0db2a.png"
        ),
        output=Path("/Users/yuriysrybnik/Documents/New project/assets/hero/hero_windmage_idle_sheet_256.png"),
        ms_per_frame=130,
        loop=True,
    ),
    AnimationSpec(
        name="run",
        frames=10,
        source=Path(
            "/Users/yuriysrybnik/.codex/generated_images/019db5c4-1098-7032-82d0-039d4d89f5b1/"
            "ig_092bd27d7f2376d10169e9441da12c81989e6aedb622eb51f1.png"
        ),
        output=Path("/Users/yuriysrybnik/Documents/New project/assets/hero/hero_windmage_run_sheet_256.png"),
        ms_per_frame=80,
        loop=True,
    ),
    AnimationSpec(
        name="jump",
        frames=8,
        source=Path(
            "/Users/yuriysrybnik/.codex/generated_images/019db5c4-1098-7032-82d0-039d4d89f5b1/"
            "ig_0ad07495f54be4e70169e8f2dad978819b9a6ceba918e2dfa8.png"
        ),
        output=Path("/Users/yuriysrybnik/Documents/New project/assets/hero/hero_windmage_jump_sheet_256.png"),
        ms_per_frame=95,
        loop=False,
    ),
    AnimationSpec(
        name="attack",
        frames=10,
        source=Path(
            "/Users/yuriysrybnik/.codex/generated_images/019db5c4-1098-7032-82d0-039d4d89f5b1/"
            "ig_0ad07495f54be4e70169e8f306e874819b9ab00eb7cceb3d65.png"
        ),
        output=Path("/Users/yuriysrybnik/Documents/New project/assets/hero/hero_windmage_attack_sheet_256.png"),
        ms_per_frame=75,
        loop=False,
        event_frame=8,
        event_name="staff_strike_release",
    ),
    AnimationSpec(
        name="magic",
        frames=12,
        source=Path(
            "/Users/yuriysrybnik/.codex/generated_images/019db5c4-1098-7032-82d0-039d4d89f5b1/"
            "ig_0ad07495f54be4e70169e8f3c46d74819bb6c14ccfc68f67ea.png"
        ),
        output=Path("/Users/yuriysrybnik/Documents/New project/assets/hero/hero_windmage_magic_sheet_256.png"),
        ms_per_frame=85,
        loop=False,
        event_frame=8,
        event_name="projectile_spawn",
    ),
    AnimationSpec(
        name="hit",
        frames=6,
        source=Path(
            "/Users/yuriysrybnik/.codex/generated_images/019db5c4-1098-7032-82d0-039d4d89f5b1/"
            "ig_0ad07495f54be4e70169e8f4174108819bb8ca4243839d7cad.png"
        ),
        output=Path("/Users/yuriysrybnik/Documents/New project/assets/hero/hero_windmage_hit_sheet_256.png"),
        ms_per_frame=90,
        loop=False,
    ),
    AnimationSpec(
        name="death",
        frames=8,
        source=Path(
            "/Users/yuriysrybnik/.codex/generated_images/019db5c4-1098-7032-82d0-039d4d89f5b1/"
            "ig_0ad07495f54be4e70169e8f44d45e0819b940d4550cc07547d.png"
        ),
        output=Path("/Users/yuriysrybnik/Documents/New project/assets/hero/hero_windmage_death_sheet_256.png"),
        ms_per_frame=120,
        loop=False,
    ),
]

GRID_OUTPUT_DIR = Path("/Users/yuriysrybnik/Documents/New project/assets/hero/grids")
METADATA_PATH = Path("/Users/yuriysrybnik/Documents/New project/assets/hero/hero_windmage_animation_metadata.json")
VALIDATION_PATH = Path("/Users/yuriysrybnik/Documents/New project/assets/hero/hero_windmage_validation_report.json")


def is_magenta(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r >= MAGENTA_MIN_R and b >= MAGENTA_MIN_B and g <= MAGENTA_MAX_G and abs(r - b) <= 60


def is_guide_color(rgb: tuple[int, int, int]) -> bool:
    if is_magenta(rgb):
        return True
    r, g, b = rgb
    near_gray = abs(r - g) <= 4 and abs(g - b) <= 4
    return near_gray and 150 <= r <= 240


def rgb_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def group_values(values: list[int], gap: int = 1) -> list[tuple[int, int]]:
    if not values:
        return []
    values = sorted(values)
    out: list[tuple[int, int]] = []
    start = values[0]
    prev = values[0]
    for value in values[1:]:
        if value <= prev + gap:
            prev = value
            continue
        out.append((start, prev))
        start = prev = value
    out.append((start, prev))
    return out


def detect_grid(img: Image.Image, frame_count: int) -> tuple[int, int, list[int]]:
    width, height = img.size
    pixels = img.convert("RGBA").load()

    def count_rows(use_magenta_only: bool) -> list[int]:
        out = []
        for y in range(height):
            count = 0
            for x in range(width):
                rgb = pixels[x, y][:3]
                if is_magenta(rgb) if use_magenta_only else is_guide_color(rgb):
                    count += 1
            out.append(count)
        return out

    row_counts = count_rows(use_magenta_only=True)
    strong_rows = [idx for idx, count in enumerate(row_counts) if count >= int(width * 0.18)]
    row_groups = group_values(strong_rows, gap=2)
    if len(row_groups) < 2:
        row_counts = count_rows(use_magenta_only=False)
        strong_rows = [idx for idx, count in enumerate(row_counts) if count >= int(width * 0.18)]
        row_groups = group_values(strong_rows, gap=2)
    if len(row_groups) < 2:
        raise ValueError(f"Failed to detect horizontal guide rows, found {len(row_groups)} groups")

    if len(row_groups) >= 4:
        top_group = row_groups[1]
        bottom_group = row_groups[-2]
    else:
        top_group = row_groups[0]
        bottom_group = row_groups[-1]
    y0 = round((top_group[0] + top_group[1]) / 2) + 1
    y1 = round((bottom_group[0] + bottom_group[1]) / 2)
    if y1 <= y0:
        raise ValueError("Invalid grid vertical bounds")

    def count_cols(use_magenta_only: bool) -> list[int]:
        out: list[int] = []
        for x in range(width):
            count = 0
            for y in range(y0, y1):
                rgb = pixels[x, y][:3]
                if is_magenta(rgb) if use_magenta_only else is_guide_color(rgb):
                    count += 1
            out.append(count)
        return out

    col_counts = count_cols(use_magenta_only=True)
    strong_cols = [idx for idx, count in enumerate(col_counts) if count >= int((y1 - y0) * 0.16)]
    if len(strong_cols) < 2:
        col_counts = count_cols(use_magenta_only=False)
        strong_cols = [idx for idx, count in enumerate(col_counts) if count >= int((y1 - y0) * 0.16)]
    if len(strong_cols) < 2:
        raise ValueError(f"Failed to detect vertical guide columns, found {len(strong_cols)}")
    col_groups = group_values(strong_cols, gap=2)
    centers = [round((start + end) / 2) for start, end in col_groups]

    approx = width / frame_count
    merge_threshold = max(12, int(approx * 0.22))
    clustered: list[int] = []
    for center in centers:
        if not clustered or center - clustered[-1] > merge_threshold:
            clustered.append(center)
        else:
            clustered[-1] = round((clustered[-1] + center) / 2)

    if len(clustered) == frame_count + 1:
        boundaries = clustered
    else:
        left = min(strong_cols)
        right = max(strong_cols)
        ideal = [round(left + i * (right - left) / frame_count) for i in range(frame_count + 1)]
        boundaries = []
        for target in ideal:
            nearest = min(clustered, key=lambda c: abs(c - target)) if clustered else target
            if abs(nearest - target) <= int(approx * 0.26):
                boundaries.append(nearest)
            else:
                boundaries.append(target)

    deduped = [boundaries[0]]
    for boundary in boundaries[1:]:
        if boundary <= deduped[-1]:
            boundary = deduped[-1] + 2
        deduped.append(boundary)
    boundaries = deduped

    return y0, y1, boundaries


def border_palette(img: Image.Image) -> list[tuple[int, int, int]]:
    rgba = img.convert("RGBA")
    width, height = rgba.size
    px = rgba.load()
    counter: Counter[tuple[int, int, int]] = Counter()

    for x in range(width):
        for y in (0, height - 1):
            rgb = px[x, y][:3]
            if not is_guide_color(rgb):
                counter[rgb] += 1
    for y in range(height):
        for x in (0, width - 1):
            rgb = px[x, y][:3]
            if not is_guide_color(rgb):
                counter[rgb] += 1
    return [rgb for rgb, _ in counter.most_common(5)]


def remove_small_components(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    width, height = rgba.size
    alpha = rgba.getchannel("A")
    a_px = alpha.load()
    visited = bytearray(width * height)
    out = rgba.copy()
    out_px = out.load()

    def idx(x: int, y: int) -> int:
        return y * width + x

    for y in range(height):
        for x in range(width):
            if a_px[x, y] == 0:
                continue
            i = idx(x, y)
            if visited[i]:
                continue
            visited[i] = 1
            queue: deque[tuple[int, int]] = deque([(x, y)])
            component = [(x, y)]

            while queue:
                cx, cy = queue.popleft()
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    ni = idx(nx, ny)
                    if visited[ni] or a_px[nx, ny] == 0:
                        continue
                    visited[ni] = 1
                    queue.append((nx, ny))
                    component.append((nx, ny))

            if len(component) < MIN_COMPONENT_AREA:
                for cx, cy in component:
                    out_px[cx, cy] = (0, 0, 0, 0)

    return out


def remove_detached_artifacts(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    width, height = rgba.size
    alpha = rgba.getchannel("A")
    a_px = alpha.load()
    visited = bytearray(width * height)
    components: list[dict[str, object]] = []

    def idx(x: int, y: int) -> int:
        return y * width + x

    for y in range(height):
        for x in range(width):
            if a_px[x, y] == 0:
                continue
            i = idx(x, y)
            if visited[i]:
                continue
            visited[i] = 1
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
                    ni = idx(nx, ny)
                    if visited[ni] or a_px[nx, ny] == 0:
                        continue
                    visited[ni] = 1
                    queue.append((nx, ny))
                    pixels.append((nx, ny))
            components.append(
                {
                    "area": len(pixels),
                    "bbox": (min_x, min_y, max_x + 1, max_y + 1),
                    "pixels": pixels,
                }
            )

    if len(components) <= 1:
        return rgba

    largest = max(components, key=lambda comp: int(comp["area"]))
    lx0, ly0, lx1, ly1 = largest["bbox"]  # type: ignore[misc]
    pad_x = 64
    pad_y = 76
    keep_area_threshold = max(120, int(int(largest["area"]) * 0.03))

    out = rgba.copy()
    out_px = out.load()
    for comp in components:
        area = int(comp["area"])
        x0, y0, x1, y1 = comp["bbox"]  # type: ignore[misc]
        intersects_core = not (
            x1 < lx0 - pad_x or x0 > lx1 + pad_x or y1 < ly0 - pad_y or y0 > ly1 + pad_y
        )
        keep = comp is largest or area >= keep_area_threshold or intersects_core
        if keep:
            continue
        for cx, cy in comp["pixels"]:  # type: ignore[misc]
            out_px[cx, cy] = (0, 0, 0, 0)
    return out


def keep_primary_component(img: Image.Image, keep_large_secondary_area: int = 900) -> Image.Image:
    rgba = img.convert("RGBA")
    width, height = rgba.size
    alpha = rgba.getchannel("A")
    a_px = alpha.load()
    visited = bytearray(width * height)
    components: list[dict[str, object]] = []

    def idx(x: int, y: int) -> int:
        return y * width + x

    for y in range(height):
        for x in range(width):
            if a_px[x, y] == 0:
                continue
            i = idx(x, y)
            if visited[i]:
                continue
            visited[i] = 1
            queue: deque[tuple[int, int]] = deque([(x, y)])
            pixels: list[tuple[int, int]] = [(x, y)]
            while queue:
                cx, cy = queue.popleft()
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    ni = idx(nx, ny)
                    if visited[ni] or a_px[nx, ny] == 0:
                        continue
                    visited[ni] = 1
                    queue.append((nx, ny))
                    pixels.append((nx, ny))
            components.append({"area": len(pixels), "pixels": pixels})

    if len(components) <= 1:
        return rgba

    largest = max(components, key=lambda comp: int(comp["area"]))
    out = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    out_px = out.load()
    in_px = rgba.load()
    for comp in components:
        area = int(comp["area"])
        if comp is largest or area >= keep_large_secondary_area:
            for cx, cy in comp["pixels"]:  # type: ignore[misc]
                out_px[cx, cy] = in_px[cx, cy]
    return out


def keep_major_components(img: Image.Image, min_ratio: float = 0.04, min_area: int = 80) -> Image.Image:
    rgba = img.convert("RGBA")
    components = component_bboxes(rgba)
    if len(components) <= 1:
        return rgba
    largest_area = max(area for area, _ in components)
    keep_threshold = max(min_area, int(largest_area * min_ratio))

    width, height = rgba.size
    alpha = rgba.getchannel("A")
    a_px = alpha.load()
    visited = bytearray(width * height)
    out = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    out_px = out.load()
    in_px = rgba.load()

    def idx(x: int, y: int) -> int:
        return y * width + x

    for y in range(height):
        for x in range(width):
            if a_px[x, y] == 0:
                continue
            i = idx(x, y)
            if visited[i]:
                continue
            visited[i] = 1
            queue: deque[tuple[int, int]] = deque([(x, y)])
            pixels: list[tuple[int, int]] = [(x, y)]
            while queue:
                cx, cy = queue.popleft()
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    ni = idx(nx, ny)
                    if visited[ni] or a_px[nx, ny] == 0:
                        continue
                    visited[ni] = 1
                    queue.append((nx, ny))
                    pixels.append((nx, ny))
            if len(pixels) >= keep_threshold:
                for cx, cy in pixels:
                    out_px[cx, cy] = in_px[cx, cy]
    return out


def component_bboxes(img: Image.Image) -> list[tuple[int, tuple[int, int, int, int]]]:
    rgba = img.convert("RGBA")
    width, height = rgba.size
    alpha = rgba.getchannel("A")
    a_px = alpha.load()
    visited = bytearray(width * height)
    out: list[tuple[int, tuple[int, int, int, int]]] = []

    def idx(x: int, y: int) -> int:
        return y * width + x

    for y in range(height):
        for x in range(width):
            if a_px[x, y] == 0:
                continue
            i = idx(x, y)
            if visited[i]:
                continue
            visited[i] = 1
            queue: deque[tuple[int, int]] = deque([(x, y)])
            area = 0
            min_x = max_x = x
            min_y = max_y = y
            while queue:
                cx, cy = queue.popleft()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    ni = idx(nx, ny)
                    if visited[ni] or a_px[nx, ny] == 0:
                        continue
                    visited[ni] = 1
                    queue.append((nx, ny))
            out.append((area, (min_x, min_y, max_x + 1, max_y + 1)))
    return out


def largest_component_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    components = component_bboxes(img)
    if not components:
        bbox = img.getbbox()
        if not bbox:
            raise ValueError("No non-transparent component found")
        return bbox
    return max(components, key=lambda item: item[0])[1]


def clean_cell(cell: Image.Image) -> Image.Image:
    rgba = cell.convert("RGBA")
    px = rgba.load()
    width, height = rgba.size
    palette = border_palette(rgba)

    def looks_like_background(rgb: tuple[int, int, int]) -> bool:
        if is_guide_color(rgb):
            return True
        if any(rgb_distance(rgb, bg) <= BACKGROUND_TOLERANCE for bg in palette):
            return True
        high = max(rgb)
        low = min(rgb)
        sat = high - low
        if sat <= 18 and high >= 195:
            return True
        if sat <= 22 and high >= 180 and min(rgb) >= 160:
            return True
        return False

    for y in range(height):
        for x in range(width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if looks_like_background((r, g, b)):
                px[x, y] = (0, 0, 0, 0)

    rgba = remove_small_components(rgba)
    rgba = remove_detached_artifacts(rgba)
    bbox = rgba.getbbox()
    if not bbox:
        raise ValueError("Frame became empty during background cleanup")
    return rgba.crop(bbox)


@dataclass
class FrameRecord:
    image: Image.Image
    source_bbox: tuple[int, int, int, int]


def extract_frames(spec: AnimationSpec, source_img: Image.Image) -> tuple[list[FrameRecord], dict[str, int]]:
    y0, y1, boundaries = detect_grid(source_img, spec.frames)
    frames: list[FrameRecord] = []
    inset = 4
    for idx in range(spec.frames):
        left = boundaries[idx] + inset
        right = boundaries[idx + 1] - inset
        if right <= left:
            raise ValueError(f"{spec.name}: invalid frame boundary at index {idx}")
        raw_cell = source_img.crop((left, y0 + inset, right, y1 - inset))
        cleaned = clean_cell(raw_cell)
        if not cleaned.getbbox():
            raise ValueError(f"{spec.name}: empty cleaned frame {idx}")
        frames.append(FrameRecord(image=cleaned, source_bbox=(left, y0 + inset, right, y1 - inset)))

    return frames, {"grid_top": y0, "grid_bottom": y1, "frame_start_x": boundaries[0], "frame_end_x": boundaries[-1]}


def layout_frames(frames: list[FrameRecord]) -> tuple[list[Image.Image], list[tuple[int, int, int, int]], float]:
    records: list[dict[str, float | tuple[int, int, int, int] | Image.Image]] = []

    for frame in frames:
        bbox_all = frame.image.getbbox()
        if not bbox_all:
            raise ValueError("Frame has no content bounds")
        bbox_char = largest_component_bbox(frame.image)
        anchor_x = (bbox_char[0] + bbox_char[2]) / 2
        anchor_y = bbox_char[3]
        records.append(
            {
                "image": frame.image,
                "bbox_all": bbox_all,
                "bbox_char": bbox_char,
                "anchor_x": anchor_x,
                "anchor_y": anchor_y,
            }
        )

    max_scale = 99.0
    for record in records:
        bbox_all = record["bbox_all"]  # type: ignore[assignment]
        anchor_x = float(record["anchor_x"])  # type: ignore[arg-type]
        anchor_y = float(record["anchor_y"])  # type: ignore[arg-type]
        left_extent = anchor_x - bbox_all[0]
        right_extent = bbox_all[2] - anchor_x
        top_extent = anchor_y - bbox_all[1]
        bottom_extent = bbox_all[3] - anchor_y

        limits = [
            (TARGET_CENTER_X - SIDE_MARGIN) / max(1.0, left_extent),
            (FRAME_SIZE - TARGET_CENTER_X - SIDE_MARGIN) / max(1.0, right_extent),
            (TARGET_GROUND_Y - TOP_MARGIN) / max(1.0, top_extent),
            (FRAME_SIZE - TARGET_GROUND_Y - BOTTOM_MARGIN) / max(1.0, bottom_extent),
        ]
        max_scale = min(max_scale, *limits)

    scale = max(0.05, min(1.0, max_scale * 0.985))

    rendered_frames: list[Image.Image] = []
    final_bboxes: list[tuple[int, int, int, int]] = []

    for record in records:
        image = record["image"]  # type: ignore[assignment]
        bbox_all = record["bbox_all"]  # type: ignore[assignment]
        anchor_x = float(record["anchor_x"])  # type: ignore[arg-type]
        anchor_y = float(record["anchor_y"])  # type: ignore[arg-type]

        crop = image.crop(bbox_all)
        scaled_w = max(1, round(crop.width * scale))
        scaled_h = max(1, round(crop.height * scale))
        scaled = crop.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

        anchor_in_crop_x = (anchor_x - bbox_all[0]) * scale
        anchor_in_crop_y = (anchor_y - bbox_all[1]) * scale
        paste_x = round(TARGET_CENTER_X - anchor_in_crop_x)
        paste_y = round(TARGET_GROUND_Y - anchor_in_crop_y)

        canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(scaled, (paste_x, paste_y))
        canvas = remove_small_components(canvas)
        canvas = remove_detached_artifacts(canvas)

        char_bbox = largest_component_bbox(canvas)
        center_now = round((char_bbox[0] + char_bbox[2]) / 2)
        bottom_now = char_bbox[3]
        dx = TARGET_CENTER_X - center_now
        dy = TARGET_GROUND_Y - bottom_now
        if dx or dy:
            shifted = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
            shifted.alpha_composite(canvas, (dx, dy))
            canvas = shifted
            canvas = remove_small_components(canvas)
            canvas = remove_detached_artifacts(canvas)

        out_bbox = canvas.getbbox()
        if not out_bbox:
            raise ValueError("Rendered frame ended empty")
        rendered_frames.append(canvas)
        final_bboxes.append(out_bbox)

    return rendered_frames, final_bboxes, scale


def save_sheet(frames: list[Image.Image], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (FRAME_SIZE * len(frames), FRAME_SIZE), (0, 0, 0, 0))
    for idx, frame in enumerate(frames):
        sheet.alpha_composite(frame, (idx * FRAME_SIZE, 0))
    sheet.save(output_path)


def save_reference_grid(spec: AnimationSpec, source_path: Path) -> Path:
    GRID_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out = GRID_OUTPUT_DIR / f"windmage_{spec.name}_grid_{spec.frames}f.png"
    Image.open(source_path).save(out)
    return out


def grid_shape_for_frames(frame_count: int) -> tuple[int, int]:
    if frame_count == 8:
        return (4, 2)
    if frame_count == 10:
        return (5, 2)
    if frame_count == 12:
        return (4, 3)
    if frame_count == 16:
        return (4, 4)
    cols = min(frame_count, 6)
    rows = math.ceil(frame_count / cols)
    return (cols, rows)


def load_grid_fonts() -> tuple[ImageFont.FreeTypeFont | ImageFont.ImageFont, ImageFont.FreeTypeFont | ImageFont.ImageFont]:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    small: ImageFont.FreeTypeFont | ImageFont.ImageFont
    large: ImageFont.FreeTypeFont | ImageFont.ImageFont
    for path in candidates:
        try:
            small = ImageFont.truetype(path, 22)
            large = ImageFont.truetype(path, 56)
            return small, large
        except OSError:
            continue
    return ImageFont.load_default(), ImageFont.load_default()


def render_standard_grid(frame_count: int, out_path: Path) -> None:
    cols, rows = grid_shape_for_frames(frame_count)
    width = cols * FRAME_SIZE
    height = rows * FRAME_SIZE

    bg = (255, 255, 255, 255)
    line = (204, 204, 204, 255)
    ground = (230, 230, 230, 255)
    center = (210, 210, 210, 255)
    coord_text = (140, 140, 140, 255)
    index_text = (180, 180, 180, 255)

    img = Image.new("RGBA", (width, height), bg)
    draw = ImageDraw.Draw(img)
    small_font, large_font = load_grid_fonts()

    for c in range(cols + 1):
        x = c * FRAME_SIZE
        draw.line([(x, 0), (x, height - 1)], fill=line, width=1)
    for r in range(rows + 1):
        y = r * FRAME_SIZE
        draw.line([(0, y), (width - 1, y)], fill=line, width=1)

    for idx in range(frame_count):
        r = idx // cols
        c = idx % cols
        x0 = c * FRAME_SIZE
        y0 = r * FRAME_SIZE

        center_x = x0 + TARGET_CENTER_X
        center_y = y0 + TARGET_CENTER_X
        draw.line([(center_x - 10, center_y), (center_x + 10, center_y)], fill=center, width=1)
        draw.line([(center_x, center_y - 10), (center_x, center_y + 10)], fill=center, width=1)

        gy = y0 + TARGET_GROUND_Y
        draw.line([(x0 + 20, gy), (x0 + FRAME_SIZE - 20, gy)], fill=ground, width=1)

        coord = f"{c + 1},{r + 1}"
        draw.text((x0 + 5, y0 + 6), coord, fill=coord_text, font=small_font)

        label = f"#{idx + 1}"
        label_box = draw.textbbox((0, 0), label, font=large_font)
        label_w = label_box[2] - label_box[0]
        tx = x0 + FRAME_SIZE - 10 - label_w
        ty = y0 + 8
        draw.text((tx, ty), label, fill=index_text, font=large_font)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path)


def write_standard_grid_set() -> dict[str, str]:
    outputs = {}
    for frame_count in (8, 10, 12, 16):
        path = GRID_OUTPUT_DIR / f"sprite_reference_grid_{frame_count}f_256.png"
        render_standard_grid(frame_count, path)
        outputs[f"{frame_count}f"] = str(path)
    return outputs


def save_programmatic_grid_template(spec: AnimationSpec, _source_size: tuple[int, int]) -> Path:
    out = GRID_OUTPUT_DIR / f"windmage_{spec.name}_grid_{spec.frames}f_programmatic.png"
    render_standard_grid(spec.frames, out)
    return out


def validate_sheet(spec: AnimationSpec, output_path: Path) -> dict[str, object]:
    sheet = Image.open(output_path).convert("RGBA")
    errors: list[str] = []
    warnings: list[str] = []

    expected_size = (FRAME_SIZE * spec.frames, FRAME_SIZE)
    if sheet.size != expected_size:
        errors.append(f"Unexpected sheet size: {sheet.size}, expected {expected_size}")

    bboxes: list[tuple[int, int, int, int]] = []
    alpha_zero_ratios: list[float] = []
    blue_present = 0
    purple_present = 0
    cyan_present = 0

    for idx in range(spec.frames):
        frame = sheet.crop((idx * FRAME_SIZE, 0, (idx + 1) * FRAME_SIZE, FRAME_SIZE))
        bbox = frame.getbbox()
        if not bbox:
            errors.append(f"Frame {idx + 1} is empty")
            continue
        bboxes.append(bbox)
        if bbox[0] <= 0 or bbox[1] <= 0 or bbox[2] >= FRAME_SIZE or bbox[3] >= FRAME_SIZE:
            errors.append(f"Frame {idx + 1} touches cell edge (possible clipping): bbox={bbox}")

        alpha = frame.getchannel("A")
        zero_ratio = alpha.histogram()[0] / (FRAME_SIZE * FRAME_SIZE)
        alpha_zero_ratios.append(zero_ratio)
        if zero_ratio < 0.15:
            errors.append(f"Frame {idx + 1} has low transparency ratio ({zero_ratio:.3f})")

        char_bbox = largest_component_bbox(frame)
        char_center = round((char_bbox[0] + char_bbox[2]) / 2)
        char_bottom = char_bbox[3]
        if abs(char_center - TARGET_CENTER_X) > 1:
            errors.append(
                f"Frame {idx + 1} center misaligned: x={char_center}, expected {TARGET_CENTER_X}"
            )
        if abs(char_bottom - TARGET_GROUND_Y) > 1:
            errors.append(
                f"Frame {idx + 1} ground misaligned: y={char_bottom}, expected {TARGET_GROUND_Y}"
            )

        px = frame.load()
        local_blue = 0
        local_purple = 0
        local_cyan = 0
        for y in range(FRAME_SIZE):
            for x in range(FRAME_SIZE):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                if b >= g + 8 and b >= r + 20 and b > 95:
                    local_blue += 1
                if r > g + 12 and b > g + 12 and r > 70 and b > 70:
                    local_purple += 1
                if g > 120 and b > 120 and r < 110:
                    local_cyan += 1
        blue_present += int(local_blue > 80)
        purple_present += int(local_purple > 40)
        cyan_present += int(local_cyan > 25)

    if blue_present < max(1, math.floor(spec.frames * 0.6)):
        errors.append("Blue pants palette signal missing in too many frames")
    if purple_present < max(1, math.floor(spec.frames * 0.5)):
        errors.append("Purple sash palette signal missing in too many frames")
    if cyan_present < max(1, math.floor(spec.frames * 0.4)):
        errors.append("Cyan staff-tip palette signal missing in too many frames")

    if bboxes:
        heights = [bbox[3] - bbox[1] for bbox in bboxes]
        ratio = max(heights) / max(1, min(heights))
        threshold = 1.8 if spec.name in {"death", "jump", "attack", "magic"} else 1.4
        if ratio > threshold:
            warnings.append(
                f"Large frame-height variance ({ratio:.2f}) for {spec.name}; review timing/pose readability in-engine."
            )

    return {
        "animation": spec.name,
        "output": str(output_path),
        "size": {"width": sheet.width, "height": sheet.height},
        "frame_count": spec.frames,
        "errors": errors,
        "warnings": warnings,
        "alpha_zero_ratio_avg": round(sum(alpha_zero_ratios) / max(1, len(alpha_zero_ratios)), 4),
    }


def main() -> None:
    standard_grids = write_standard_grid_set()
    metadata = {
        "character": "hero_windmage",
        "design_lock": {
            "head": "bald bearded monk",
            "torso": "bare torso with tattoo",
            "arms": "arm wraps",
            "legs": "blue pants",
            "waist": "purple sash",
            "feet": "sandals",
            "weapon": "simple straight wooden staff with cyan tips",
            "forbidden_accessories": ["scarf", "cloak", "back accessory"],
        },
        "frame_size": FRAME_SIZE,
        "standard_reference_grids": standard_grids,
        "animations": [],
    }
    validation = {"status": "pass", "animations": []}

    for spec in ANIMATIONS:
        source_img = Image.open(spec.source).convert("RGBA")
        grid_copy = save_reference_grid(spec, spec.source)
        template_grid = save_programmatic_grid_template(spec, source_img.size)
        frames, grid_info = extract_frames(spec, source_img)
        rendered_frames, final_bboxes, scale = layout_frames(frames)
        if spec.name == "magic":
            rendered_frames = [keep_major_components(frame, min_ratio=0.015, min_area=90) for frame in rendered_frames]
        else:
            rendered_frames = [keep_major_components(frame, min_ratio=0.04, min_area=90) for frame in rendered_frames]
        save_sheet(rendered_frames, spec.output)
        report = validate_sheet(spec, spec.output)
        if report["errors"]:
            validation["status"] = "fail"
        validation["animations"].append(report)

        animation_meta: dict[str, object] = {
            "name": spec.name,
            "frame_count": spec.frames,
            "sheet_path": str(spec.output),
            "source_grid_path": str(grid_copy),
            "programmatic_grid_template_path": str(template_grid),
            "timing": {
                "ms_per_frame": spec.ms_per_frame,
                "fps_equivalent": round(1000 / spec.ms_per_frame, 3),
                "loop": spec.loop,
            },
            "normalization": {
                "frame_size": FRAME_SIZE,
                "fit_scale": round(scale, 6),
                "grid": grid_info,
                "final_bboxes": [list(bbox) for bbox in final_bboxes],
            },
        }
        if spec.event_frame and spec.event_name:
            animation_meta["timing"]["event"] = {"name": spec.event_name, "frame": spec.event_frame}
        metadata["animations"].append(animation_meta)

    METADATA_PATH.write_text(json.dumps(metadata, indent=2))
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2))

    print(json.dumps({"metadata_path": str(METADATA_PATH), "validation_path": str(VALIDATION_PATH), **validation}, indent=2))


if __name__ == "__main__":
    main()
