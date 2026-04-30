from __future__ import annotations

import json
from collections import Counter, deque
from pathlib import Path

from PIL import Image


INPUTS = [
    {
        "name": "idle",
        "frames": 6,
        "path": "/Users/yuriysrybnik/.codex/generated_images/019db1c9-1222-7fe2-aad8-20b8079a0198/ig_0cada7b5db6860ec0169e7e89d14088198ad75be406ef39b9f.png",
    },
    {
        "name": "run",
        "frames": 8,
        "path": "/Users/yuriysrybnik/.codex/generated_images/019db1c9-1222-7fe2-aad8-20b8079a0198/ig_0cada7b5db6860ec0169e7e8fac2708198a3a2c72926a9c947.png",
    },
    {
        "name": "jump",
        "frames": 12,
        "path": "/Users/yuriysrybnik/.codex/generated_images/019db1c9-1222-7fe2-aad8-20b8079a0198/ig_0cada7b5db6860ec0169e7e950abc08198a873b1e5312b0a67.png",
    },
]

OUTPUT_DIR = Path("/Users/yuriysrybnik/Documents/New project/assets/generated/monk")
PADDING_X = 12
PADDING_Y = 12
BACKGROUND_TOLERANCE = 18
LABEL_MAX_HEIGHT = 55
LABEL_MAX_WIDTH = 80
LABEL_MAX_AREA = 2500


def rgb_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return sum(abs(x - y) for x, y in zip(a, b))


def border_palette(img: Image.Image) -> list[tuple[int, int, int]]:
    width, height = img.size
    pixels = img.load()
    counter: Counter[tuple[int, int, int]] = Counter()

    for x in range(width):
        counter[pixels[x, 0][:3]] += 1
        counter[pixels[x, height - 1][:3]] += 1
    for y in range(height):
        counter[pixels[0, y][:3]] += 1
        counter[pixels[width - 1, y][:3]] += 1

    return [color for color, _ in counter.most_common(6)]


def remove_checkerboard_background(img: Image.Image) -> Image.Image:
    width, height = img.size
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    bg_colors = border_palette(rgba)

    def looks_like_background(color: tuple[int, int, int]) -> bool:
        return any(rgb_distance(color, bg) <= BACKGROUND_TOLERANCE for bg in bg_colors)

    visited = bytearray(width * height)
    background = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def idx(x: int, y: int) -> int:
        return y * width + x

    def enqueue(x: int, y: int) -> None:
        i = idx(x, y)
        if visited[i]:
            return
        visited[i] = 1
        if looks_like_background(pixels[x, y][:3]):
            background[i] = 1
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                i = idx(nx, ny)
                if visited[i]:
                    continue
                visited[i] = 1
                if looks_like_background(pixels[nx, ny][:3]):
                    background[i] = 1
                    queue.append((nx, ny))

    out = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    out_pixels = out.load()
    for y in range(height):
        for x in range(width):
            i = idx(x, y)
            if background[i]:
                continue
            out_pixels[x, y] = pixels[x, y]
    return out


def find_components(mask: Image.Image) -> list[dict[str, int | tuple[int, int, int, int]]]:
    width, height = mask.size
    mask_pixels = mask.load()
    visited = bytearray(width * height)
    components = []

    def idx(x: int, y: int) -> int:
        return y * width + x

    for y in range(height):
        for x in range(width):
            i = idx(x, y)
            if visited[i] or not mask_pixels[x, y]:
                continue
            visited[i] = 1
            queue: deque[tuple[int, int]] = deque([(x, y)])
            min_x = max_x = x
            min_y = max_y = y
            area = 0
            while queue:
                cx, cy = queue.popleft()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        ni = idx(nx, ny)
                        if visited[ni] or not mask_pixels[nx, ny]:
                            continue
                        visited[ni] = 1
                        queue.append((nx, ny))
            bbox = (min_x, min_y, max_x + 1, max_y + 1)
            components.append(
                {
                    "bbox": bbox,
                    "area": area,
                    "width": bbox[2] - bbox[0],
                    "height": bbox[3] - bbox[1],
                }
            )
    return components


def boxes_intersect(a: tuple[int, int, int, int], b: tuple[int, int, int, int], margin_x: int, margin_y: int) -> bool:
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    return not (ax1 < bx0 - margin_x or ax0 > bx1 + margin_x or ay1 < by0 - margin_y or ay0 > by1 + margin_y)


def select_frame_bbox(frame: Image.Image) -> tuple[int, int, int, int]:
    width, height = frame.size
    mask = frame.getchannel("A").point(lambda value: 255 if value > 0 else 0)
    components = []

    for component in find_components(mask):
        if int(component["area"]) < 16:
            continue
        x0, y0, x1, y1 = component["bbox"]  # type: ignore[index]
        is_label = (
            y0 > int(height * 0.72)
            and int(component["height"]) < LABEL_MAX_HEIGHT
            and int(component["width"]) < LABEL_MAX_WIDTH
            and int(component["area"]) < LABEL_MAX_AREA
        )
        if not is_label:
            components.append(component)

    if not components:
        return frame.getbbox() or (0, 0, width, height)

    largest = max(components, key=lambda component: int(component["area"]))
    largest_box = largest["bbox"]  # type: ignore[index]
    keep = [largest]

    for component in components:
        if component is largest:
            continue
        box = component["bbox"]  # type: ignore[index]
        close = boxes_intersect(box, largest_box, 80, 120)
        x_overlap = not (box[2] < largest_box[0] - 25 or box[0] > largest_box[2] + 25)
        below = box[1] > largest_box[3] + 80
        large_effect = int(component["area"]) >= max(1200, int(int(largest["area"]) * 0.08))
        if close or (x_overlap and not below) or (large_effect and box[1] <= largest_box[3] + 70):
            keep.append(component)

    boxes = [component["bbox"] for component in keep]  # type: ignore[index]
    return (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )


def pack_sheet(name: str, frame_count: int, source_path: Path) -> dict[str, str | int]:
    cleaned = remove_checkerboard_background(Image.open(source_path))
    width, height = cleaned.size
    frame_edges = [round(i * width / frame_count) for i in range(frame_count + 1)]

    frame_records = []
    for index in range(frame_count):
        x0, x1 = frame_edges[index], frame_edges[index + 1]
        slot = cleaned.crop((x0, 0, x1, height))
        bbox = select_frame_bbox(slot)
        crop = slot.crop(bbox)
        frame_records.append(
            {
                "index": index,
                "bbox": bbox,
                "crop": crop,
                "width": crop.width,
                "height": crop.height,
                "bottom": bbox[3],
            }
        )

    global_bottom = max(record["bottom"] for record in frame_records)
    cell_width = max(record["width"] for record in frame_records) + PADDING_X * 2
    cell_height = max((global_bottom - record["bottom"]) + record["height"] for record in frame_records) + PADDING_Y * 2

    sheet = Image.new("RGBA", (cell_width * frame_count, cell_height), (0, 0, 0, 0))
    frames_dir = OUTPUT_DIR / f"{name}_frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    for record in frame_records:
        paste_x = int(record["index"]) * cell_width + (cell_width - int(record["width"])) // 2
        paste_y = PADDING_Y + (global_bottom - int(record["bottom"]))
        sheet.alpha_composite(record["crop"], (paste_x, paste_y))
        record["crop"].save(frames_dir / f"{name}_{int(record['index']) + 1:02d}.png")

    sheet_path = OUTPUT_DIR / f"monk_{name}_sheet_clean.png"
    sheet.save(sheet_path)

    return {
        "name": name,
        "source": str(source_path),
        "output": str(sheet_path),
        "frame_count": frame_count,
        "cell_width": cell_width,
        "cell_height": cell_height,
        "sheet_width": sheet.width,
        "sheet_height": sheet.height,
        "frames_dir": str(frames_dir),
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    for item in INPUTS:
        manifest.append(pack_sheet(item["name"], item["frames"], Path(item["path"])))

    manifest_path = OUTPUT_DIR / "sprite_sheet_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
