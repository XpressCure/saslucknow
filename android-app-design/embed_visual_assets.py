from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
VISUAL = Path(r"C:\Users\Meghna\.codex\visualizations\2026\07\29\019faca7-3ea8-7033-88a9-1794b69e2090\sas-lucknow-android-redesign.html")


def data_uri(path: Path, max_size=(900, 620), quality=75, keep_alpha=False):
    image = Image.open(path)
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    if keep_alpha:
        if image.mode not in ("RGBA", "LA"):
            image = image.convert("RGBA")
        image.save(buffer, "WEBP", lossless=True, method=6)
    else:
        if image.mode != "RGB":
            background = Image.new("RGB", image.size, "white")
            if "A" in image.getbands():
                background.paste(image, mask=image.getchannel("A"))
            else:
                background.paste(image)
            image = background
        image.save(buffer, "WEBP", quality=quality, method=6)
    return "data:image/webp;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


assets = {
    "__LOGO__": (ROOT / "public" / "society-logo-transparent.png", (180, 180), 80, True),
    "__BANNER__": (ROOT / "public" / "song-of-life-banner.png", (900, 620), 72, False),
    "__AUROBINDO__": (ROOT / "public" / "sri-aurobindo-portrait.jpg", (320, 440), 78, False),
    "__MOTHER__": (ROOT / "public" / "the-mother-portrait.jpg", (320, 440), 78, False),
    "__PUSH_AUROBINDO__": (ROOT / "public" / "pushpanjali-sri-aurobindo.jpg", (700, 700), 78, False),
    "__FLOWER1__": (ROOT / "public" / "pushpanjali-divine-love.jpg", (220, 220), 80, False),
    "__FLOWER2__": (ROOT / "public" / "pushpanjali-integral-love.jpg", (220, 220), 80, False),
    "__FLOWER3__": (ROOT / "public" / "pushpanjali-supramental-power.jpg", (220, 220), 80, False),
    "__FLOWER1CUT__": (ROOT / "public" / "pushpanjali-divine-love-cutout.png", (220, 220), 80, True),
    "__FLOWER2CUT__": (ROOT / "public" / "pushpanjali-integral-love-cutout.png", (220, 220), 80, True),
    "__FLOWER3CUT__": (ROOT / "public" / "pushpanjali-supramental-power-cutout.png", (220, 220), 80, True),
    "__MATRIMANDIR__": (ROOT / "public" / "auroville-matrimandir.png", (420, 420), 78, False),
    "__SAVITRI_THUMB__": (ROOT / "public" / "song-of-life-banner.png", (720, 405), 70, False),
    "__GATHERING_THUMB__": (ROOT / "public" / "auroville-matrimandir.png", (720, 405), 70, False),
}

text = VISUAL.read_text(encoding="utf-8")
for token, (path, size, quality, alpha) in assets.items():
    text = text.replace(token, data_uri(path, size, quality, alpha))

VISUAL.write_text(text, encoding="utf-8")
print(VISUAL.stat().st_size)
