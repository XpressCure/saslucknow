from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw
import math

root = Path(__file__).resolve().parents[1]
source = root / "public" / "bharat-uday" / "bharat-uday-hero.png"
target = root / "public" / "bharat-uday" / "bharat-uday-motion.webp"

image = Image.open(source).convert("RGB")
canvas_size = (1280, 720)
frames = []
frame_count = 48

for index in range(frame_count):
    phase = index / frame_count
    zoom = 1.04 + 0.035 * (0.5 - 0.5 * math.cos(phase * math.tau))
    width = int(canvas_size[0] * zoom)
    height = int(canvas_size[1] * zoom)
    resized = image.resize((width, height), Image.Resampling.LANCZOS)
    x = int((width - canvas_size[0]) * (0.18 + 0.58 * phase))
    y = int((height - canvas_size[1]) * (0.55 - 0.22 * math.sin(phase * math.tau)))
    frame = resized.crop((x, y, x + canvas_size[0], y + canvas_size[1]))
    frame = ImageEnhance.Color(frame).enhance(1.08)
    frame = ImageEnhance.Contrast(frame).enhance(1.03)

    overlay = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    flare_x = int(650 + 120 * math.sin(phase * math.tau))
    flare_y = int(430 - 30 * math.cos(phase * math.tau))
    for radius in range(190, 10, -12):
        alpha = max(0, int(18 * (1 - radius / 200)))
        draw.ellipse((flare_x - radius, flare_y - radius, flare_x + radius, flare_y + radius), fill=(255, 190, 74, alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(24))
    frame = Image.alpha_composite(frame.convert("RGBA"), overlay).convert("RGB")
    frames.append(frame)

frames[0].save(
    target,
    save_all=True,
    append_images=frames[1:],
    duration=105,
    loop=0,
    quality=78,
    method=4,
)
print(target)
