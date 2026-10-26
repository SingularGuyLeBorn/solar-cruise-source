"""Generate small WebP previews so the scene can render before full textures arrive."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "public"
SOURCE_DIRS = ["planets", "moons", "dwarf", "textures"]
MAX_SIZE = 512
QUALITY = 80

for dirname in SOURCE_DIRS:
    for path in sorted((ROOT / dirname).rglob("*")):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue
        if ".preview." in path.name:
            continue
        target = path.with_name(f"{path.stem}.preview.webp")
        thumb = path.with_name(f"{path.stem}.thumb.webp")
        fresh = target.exists() and target.stat().st_mtime >= path.stat().st_mtime
        thumb_fresh = thumb.exists() and thumb.stat().st_mtime >= path.stat().st_mtime
        if fresh and thumb_fresh:
            continue
        with Image.open(path) as image:
            image = image.convert("RGB")
            image.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
            if not fresh:
                image.save(target, "WEBP", quality=QUALITY, method=6)
            image.thumbnail((192, 192), Image.LANCZOS)
            if not thumb_fresh:
                image.save(thumb, "WEBP", quality=72, method=6)
        print(f"{path.relative_to(ROOT)} -> {target.name} ({target.stat().st_size} bytes)")
