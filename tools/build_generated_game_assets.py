from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets/generated/game_assets/source"
CLEAN_DIR = ROOT / "assets/generated/game_assets/chroma_clean"
PREVIEW_DIR = ROOT / "assets/generated/game_assets/previews"
ENV_DIR = ROOT / "assets/environment"
EFFECTS_DIR = ROOT / "assets/effects"


def alpha_bbox(img: Image.Image, threshold: int = 8) -> tuple[int, int, int, int] | None:
    alpha = img.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > threshold else 0)
    return mask.getbbox()


def crop_to_aspect(img: Image.Image, aspect: float) -> Image.Image:
    width, height = img.size
    current_aspect = width / height
    if current_aspect > aspect:
        new_width = round(height * aspect)
        left = (width - new_width) // 2
        return img.crop((left, 0, left + new_width, height))
    new_height = round(width / aspect)
    top = max(0, (height - new_height) // 2)
    return img.crop((0, top, width, top + new_height))


def save_background() -> dict[str, object]:
    source = Image.open(SOURCE_DIR / "skyhold_background_raw.png").convert("RGB")
    cropped = crop_to_aspect(source, 16 / 9)
    output = cropped.resize((1280, 720), Image.Resampling.LANCZOS)
    out_path = ENV_DIR / "skyhold_background.png"
    output.save(out_path, optimize=True)
    return {"name": "background", "path": str(out_path), "size": output.size}


def save_tiles() -> dict[str, object]:
    source = Image.open(CLEAN_DIR / "skyhold_tiles_alpha.png").convert("RGBA")
    output = source.resize((1024, 1024), Image.Resampling.LANCZOS)
    out_path = ENV_DIR / "skyhold_tiles.png"
    output.save(out_path, optimize=True)
    return {"name": "tiles", "path": str(out_path), "size": output.size, "cell": [256, 256]}


def split_equal(img: Image.Image, frames: int) -> list[Image.Image]:
    width, height = img.size
    return [
        img.crop((round(index * width / frames), 0, round((index + 1) * width / frames), height))
        for index in range(frames)
    ]


def pack_equal_sheet(
    source_path: Path,
    out_path: Path,
    *,
    frames: int,
    cell_size: tuple[int, int],
    padding: int,
    align: str = "center",
) -> dict[str, object]:
    source = Image.open(source_path).convert("RGBA")
    cells = split_equal(source, frames)
    crops: list[Image.Image] = []
    boxes: list[tuple[int, int, int, int]] = []

    for index, cell in enumerate(cells, start=1):
        bbox = alpha_bbox(cell)
        if bbox is None:
            raise ValueError(f"{source_path.name}: frame {index} is empty")
        boxes.append(bbox)
        crops.append(cell.crop(bbox))

    cell_w, cell_h = cell_size
    max_w = max(crop.width for crop in crops)
    max_h = max(crop.height for crop in crops)
    scale = min((cell_w - padding * 2) / max_w, (cell_h - padding * 2) / max_h, 1.0)
    sheet = Image.new("RGBA", (cell_w * frames, cell_h), (0, 0, 0, 0))
    frame_records = []

    for index, crop in enumerate(crops):
        scaled = crop.resize(
            (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
            Image.Resampling.LANCZOS,
        )
        x = index * cell_w + (cell_w - scaled.width) // 2
        if align == "bottom":
            y = cell_h - padding - scaled.height
        else:
            y = (cell_h - scaled.height) // 2
        sheet.alpha_composite(scaled, (x, y))
        final_box = alpha_bbox(sheet.crop((index * cell_w, 0, (index + 1) * cell_w, cell_h)))
        frame_records.append(
            {
                "index": index + 1,
                "source_bbox": list(boxes[index]),
                "final_bbox": list(final_box or (0, 0, 0, 0)),
            }
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path, optimize=True)
    return {
        "name": out_path.stem,
        "path": str(out_path),
        "size": sheet.size,
        "frames": frames,
        "cell": list(cell_size),
        "scale": round(scale, 4),
        "frame_records": frame_records,
    }


def save_single_projectile(source_path: Path, out_path: Path, size: tuple[int, int], padding: int) -> dict[str, object]:
    source = Image.open(source_path).convert("RGBA")
    bbox = alpha_bbox(source)
    if bbox is None:
        raise ValueError(f"{source_path.name}: empty source")
    crop = source.crop(bbox)
    width, height = size
    scale = min((width - padding * 2) / crop.width, (height - padding * 2) / crop.height)
    scaled = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    output.alpha_composite(scaled, ((width - scaled.width) // 2, (height - scaled.height) // 2))
    output.save(out_path, optimize=True)
    return {
        "name": out_path.stem,
        "path": str(out_path),
        "size": output.size,
        "source_bbox": list(bbox),
        "scale": round(scale, 4),
    }


def checker(size: tuple[int, int], block: int = 16) -> Image.Image:
    width, height = size
    out = Image.new("RGBA", size, (36, 39, 46, 255))
    draw = ImageDraw.Draw(out)
    for y in range(0, height, block):
        for x in range(0, width, block):
            fill = (52, 57, 66, 255) if (x // block + y // block) % 2 else (34, 37, 43, 255)
            draw.rectangle((x, y, min(x + block - 1, width - 1), min(y + block - 1, height - 1)), fill=fill)
    return out


def preview_image(path: Path, size: tuple[int, int]) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    img.thumbnail(size, Image.Resampling.LANCZOS)
    tile = checker(size, 12)
    tile.alpha_composite(img, ((size[0] - img.width) // 2, (size[1] - img.height) // 2))
    return tile


def save_contact_sheet(records: list[dict[str, object]]) -> None:
    font = ImageFont.load_default()
    item_w, item_h = 260, 178
    cols = 3
    rows = (len(records) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * item_w, rows * item_h), (18, 23, 31))
    draw = ImageDraw.Draw(sheet)

    for index, record in enumerate(records):
        x = (index % cols) * item_w
        y = (index // cols) * item_h
        path = Path(str(record["path"]))
        preview = preview_image(path, (item_w - 20, item_h - 42)).convert("RGB")
        sheet.paste(preview, (x + 10, y + 26))
        draw.text((x + 10, y + 8), str(record["name"]), fill=(228, 240, 255), font=font)

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(PREVIEW_DIR / "runtime_assets_contact.png", optimize=True)


def main() -> None:
    ENV_DIR.mkdir(parents=True, exist_ok=True)
    EFFECTS_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    records = [
        save_background(),
        save_tiles(),
        pack_equal_sheet(
            CLEAN_DIR / "cloud_platform_alpha.png",
            ENV_DIR / "cloud_platform_sheet.png",
            frames=8,
            cell_size=(160, 128),
            padding=10,
            align="bottom",
        ),
        pack_equal_sheet(
            CLEAN_DIR / "core_alpha.png",
            ENV_DIR / "core_sheet.png",
            frames=8,
            cell_size=(256, 256),
            padding=12,
        ),
        save_single_projectile(CLEAN_DIR / "arrow_alpha.png", EFFECTS_DIR / "arrow.png", (128, 40), 2),
        pack_equal_sheet(
            CLEAN_DIR / "mage_spell_alpha.png",
            EFFECTS_DIR / "mage_spell_sheet.png",
            frames=8,
            cell_size=(192, 96),
            padding=4,
        ),
        pack_equal_sheet(
            CLEAN_DIR / "warrior_slash_alpha.png",
            EFFECTS_DIR / "warrior_slash_sheet.png",
            frames=8,
            cell_size=(192, 128),
            padding=4,
        ),
    ]

    save_contact_sheet(records)
    manifest_path = ROOT / "assets/generated/game_assets/manifest.json"
    manifest_path.write_text(json.dumps(records, indent=2))
    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()
