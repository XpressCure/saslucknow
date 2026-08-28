from __future__ import annotations

from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parents[1]
TOOL_DIR = ROOT / ".tmp-tools" / "imageio-ffmpeg"
if TOOL_DIR.exists():
    sys.path.insert(0, str(TOOL_DIR))

import imageio_ffmpeg  # type: ignore


SOURCE = ROOT / "public" / "bharat-uday" / "bharat-uday-hero.png"
VIDEO = ROOT / "public" / "next-human-challenge-intro.mp4"
POSTER = ROOT / "public" / "next-human-challenge-poster.jpg"
SIZE = (1280, 720)
FPS = 24
DURATION = 14.0

MIDNIGHT = (5, 24, 35)
IVORY = (255, 248, 228)
SAFFRON = (244, 164, 44)
CORAL = (230, 93, 61)
TEAL = (43, 145, 137)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    candidates = [Path("C:/Windows/Fonts") / name, Path("C:/Windows/Fonts/arial.ttf")]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


DISPLAY = font("georgiab.ttf", 76)
DISPLAY_SMALL = font("georgiab.ttf", 53)
SANS_BOLD = font("bahnschrift.ttf", 31)
SANS_HEAVY = font("arialbd.ttf", 39)
SANS = font("bahnschrift.ttf", 25)
SANS_SMALL = font("bahnschrift.ttf", 19)


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def ease(value: float) -> float:
    value = clamp(value)
    return value * value * (3 - 2 * value)


def scene_alpha(t: float, start: float, end: float, fade: float = 0.55) -> float:
    return min(ease((t - start) / fade), ease((end - t) / fade))


def fit_background(image: Image.Image) -> Image.Image:
    source_ratio = image.width / image.height
    target_ratio = SIZE[0] / SIZE[1]
    if source_ratio > target_ratio:
        height = SIZE[1]
        width = round(height * source_ratio)
    else:
        width = SIZE[0]
        height = round(width / source_ratio)
    resized = image.resize((width, height), Image.Resampling.LANCZOS)
    left = max(0, (width - SIZE[0]) // 2)
    top = max(0, (height - SIZE[1]) // 2)
    return resized.crop((left, top, left + SIZE[0], top + SIZE[1]))


def add_text(draw: ImageDraw.ImageDraw, position: tuple[int, int], value: str,
             used_font: ImageFont.ImageFont, fill: tuple[int, int, int], alpha: float,
             anchor: str = "la", spacing: int = 6) -> None:
    draw.multiline_text(position, value, font=used_font, fill=(*fill, int(255 * clamp(alpha))),
                        anchor=anchor, spacing=spacing)


def frame_at(t: float, background: Image.Image) -> Image.Image:
    # Keep the photograph stable. The story moves through clean graphic transitions,
    # so the result feels like a short film instead of a shaking still image.
    base = ImageEnhance.Color(background).enhance(0.82).convert("RGBA")
    wash = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    wash_draw = ImageDraw.Draw(wash)
    wash_draw.rectangle((0, 0, SIZE[0], SIZE[1]), fill=(*MIDNIGHT, 126))
    wash_draw.polygon([(0, 0), (800, 0), (520, SIZE[1]), (0, SIZE[1])], fill=(*MIDNIGHT, 190))
    wash_draw.rectangle((0, SIZE[1] - 16, SIZE[0], SIZE[1]), fill=(*SAFFRON, 235))
    base = Image.alpha_composite(base, wash)

    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    line_progress = ease(t / DURATION)
    line_y = 602
    draw.rounded_rectangle((76, line_y, 76 + int(1128 * line_progress), line_y + 5), radius=3, fill=(*SAFFRON, 220))
    for marker, marker_time in ((76, 0.0), (408, 3.4), (744, 7.0), (1204, 11.1)):
        marker_alpha = ease((t - marker_time) / 0.45)
        if marker_alpha > 0:
            draw.ellipse((marker - 7, line_y - 5, marker + 7, line_y + 9), fill=(*IVORY, int(255 * marker_alpha)))

    first = scene_alpha(t, 0.0, 3.8)
    if first > 0:
        add_text(draw, (82, 88), "SRI AUROBINDO SOCIETY · LUCKNOW", SANS_SMALL, SAFFRON, first)
        add_text(draw, (82, 173), "THE NEXT HUMAN\nCHALLENGE", DISPLAY, IVORY, first, spacing=-4)
        add_text(draw, (86, 368), "A journey through culture, science & consciousness", SANS, IVORY, first * 0.92)
        draw.rounded_rectangle((86, 424, 366, 478), radius=27, fill=(*CORAL, int(238 * first)))
        add_text(draw, (226, 451), "30 LEVELS · FREE TO ENTER", SANS_SMALL, IVORY, first, anchor="mm")

    second = scene_alpha(t, 3.2, 7.0)
    if second > 0:
        add_text(draw, (82, 94), "FAST. CURIOUS. MADE FOR EVERY GENERATION.", SANS_SMALL, SAFFRON, second)
        add_text(draw, (82, 175), "30", DISPLAY, IVORY, second)
        add_text(draw, (250, 196), "LEVELS", SANS_HEAVY, IVORY, second)
        add_text(draw, (82, 300), "5", DISPLAY, IVORY, second)
        add_text(draw, (205, 321), "QUESTIONS IN EACH DISCOVERY", SANS_HEAVY, IVORY, second)
        add_text(draw, (84, 438), "Start one. Finish many. Your progress waits for you.", SANS, IVORY, second * 0.9)

    third = scene_alpha(t, 6.4, 10.6)
    if third > 0:
        add_text(draw, (82, 94), "EVERY LEVEL BECOMES AN EXPERIENCE", SANS_SMALL, SAFFRON, third)
        labels = [("ANSWER", TEAL), ("DISCOVER", SAFFRON), ("PAUSE", CORAL), ("CREATE", IVORY)]
        for index, (label, colour) in enumerate(labels):
            reveal = ease((t - (6.6 + index * 0.42)) / 0.5) * third
            left = 82 + index * 276
            if index:
                add_text(draw, (left - 33, 287), "→", SANS_HEAVY, SAFFRON, reveal, anchor="mm")
            draw.rounded_rectangle((left, 235, left + 220, 340), radius=22,
                                   fill=(*MIDNIGHT, int(205 * reveal)), outline=(*colour, int(255 * reveal)), width=3)
            add_text(draw, (left + 110, 287), label, SANS_BOLD, colour, reveal, anchor="mm")
        add_text(draw, (82, 418), "Knowledge meets reflection—and becomes your own Discovery Card.",
                 DISPLAY_SMALL, IVORY, third)

    fourth = scene_alpha(t, 10.0, 14.0)
    if fourth > 0:
        add_text(draw, (82, 105), "THE JOURNEY BEGINS WITH ONE QUESTION", SANS_SMALL, SAFFRON, fourth)
        add_text(draw, (82, 186), "What will you\ndiscover about Bharat—\nand about yourself?",
                 DISPLAY_SMALL, IVORY, fourth, spacing=3)
        draw.rounded_rectangle((82, 456, 385, 520), radius=32, fill=(*SAFFRON, int(255 * fourth)))
        add_text(draw, (234, 488), "BEGIN LEVEL 01  >", SANS_BOLD, MIDNIGHT, fourth, anchor="mm")
        add_text(draw, (82, 554), "THE NEXT HUMAN CHALLENGE", SANS_SMALL, IVORY, fourth * 0.86)

    return Image.alpha_composite(base, overlay).convert("RGB")


def main() -> None:
    source = fit_background(Image.open(SOURCE).convert("RGB"))
    VIDEO.parent.mkdir(parents=True, exist_ok=True)
    frame_at(10.9, source).save(POSTER, quality=90, optimize=True)

    encoder = imageio_ffmpeg.write_frames(
        str(VIDEO), SIZE, fps=FPS, codec="libx264", pix_fmt_in="rgb24", pix_fmt_out="yuv420p",
        output_params=["-movflags", "+faststart", "-preset", "medium", "-crf", "22"],
    )
    encoder.send(None)
    try:
        for frame_index in range(round(DURATION * FPS)):
            encoder.send(frame_at(frame_index / FPS, source).tobytes())
    finally:
        encoder.close()

    print(VIDEO)
    print(POSTER)


if __name__ == "__main__":
    main()
