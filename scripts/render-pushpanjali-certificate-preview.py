from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pushpanjali-certificate-sample.png"
PORTRAIT = ROOT / "public" / "pushpanjali-sri-aurobindo.jpg"
FLOWER = ROOT / "public" / "pushpanjali-divine-love-cutout.png"
LOGO = ROOT / "public" / "society-logo.jpg"

GEORGIA = "C:/Windows/Fonts/georgia.ttf"
GEORGIA_BOLD = "C:/Windows/Fonts/georgiab.ttf"
GEORGIA_ITALIC = "C:/Windows/Fonts/georgiai.ttf"
ARIAL = "C:/Windows/Fonts/arial.ttf"
ARIAL_BOLD = "C:/Windows/Fonts/arialbd.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def centered(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, face: ImageFont.FreeTypeFont, fill: str) -> None:
    draw.text(xy, text, font=face, fill=fill, anchor="mm")


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and draw.textlength(candidate, font=face) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def main() -> None:
    width, height = 1600, 1100
    canvas = Image.new("RGB", (width, height), "#fffaf0")
    pixels = canvas.load()
    start = (255, 250, 240)
    middle = (247, 230, 187)
    end = (255, 253, 247)
    for y in range(height):
        t = y / (height - 1)
        if t < 0.48:
            local = t / 0.48
            a, b = start, middle
        else:
            local = (t - 0.48) / 0.52
            a, b = middle, end
        colour = tuple(round(a[i] + (b[i] - a[i]) * local) for i in range(3))
        for x in range(width):
            pixels[x, y] = colour

    draw = ImageDraw.Draw(canvas)
    draw.rectangle((35, 35, 1565, 1065), outline="#b98335", width=5)
    draw.rectangle((55, 55, 1545, 1045), outline="#d5b476", width=2)

    logo = Image.open(LOGO).convert("RGB")
    logo.thumbnail((100, 78), Image.Resampling.LANCZOS)
    logo_mask = Image.new("L", logo.size, 0)
    logo_mask_pixels = logo_mask.load()
    logo_pixels = logo.load()
    for y in range(logo.height):
        for x in range(logo.width):
            r, g, b = logo_pixels[x, y]
            logo_mask_pixels[x, y] = max(0, 255 - min(r, g, b))
    blue = Image.new("RGBA", logo.size, (23, 56, 70, 255))
    canvas.paste(blue.convert("RGB"), (82, 77), logo_mask)

    centered(draw, (800, 112), "SRI AUROBINDO SOCIETY · LUCKNOW", font(ARIAL_BOLD, 28), "#173846")
    centered(draw, (800, 148), "GOMTI NAGAR CENTRE (UC-02)", font(ARIAL, 20), "#a86d27")
    centered(draw, (800, 215), "Presents this", font(GEORGIA_ITALIC, 32), "#a86d27")
    centered(draw, (800, 285), "Certificate of Pushpanjali", font(GEORGIA, 64), "#173846")

    portrait_box = (105, 340, 495, 885)
    portrait = Image.open(PORTRAIT).convert("RGB")
    fitted = ImageOps.fit(portrait, (390, 545), method=Image.Resampling.LANCZOS, centering=(0.5, 0.48))
    mask = Image.new("L", fitted.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 389, 544), radius=22, fill=255)
    canvas.paste(fitted, (105, 340), mask)
    draw.rounded_rectangle(portrait_box, radius=22, outline="#c99a51", width=3)

    draw.rounded_rectangle((126, 362, 344, 440), radius=10, fill=(16, 43, 56, 205))
    draw.text((144, 374), "Sri Aurobindo", font=font(GEORGIA, 26), fill="#fffdf7")
    draw.text((144, 410), "1872–1950", font=font(ARIAL_BOLD, 16), fill="#e8c884")

    draw.text((575, 374), "This certifies that", font=font(ARIAL, 24), fill="#4b5c62")
    draw.text((575, 430), "Sample Devotee", font=font(GEORGIA, 58), fill="#173846")
    draw.text((575, 525), "has lovingly offered", font=font(ARIAL, 25), fill="#4b5c62")
    draw.text((575, 580), "Divine Love", font=font(GEORGIA_BOLD, 38), fill="#a86d27")

    quote_face = font(GEORGIA_ITALIC, 27)
    quote_lines = wrap(draw, "“A flower that is said to blossom even in the desert.”", quote_face, 700)
    quote_y = 650
    for line in quote_lines:
        draw.text((575, quote_y), line, font=quote_face, fill="#4b5c62")
        quote_y += 38
    draw.text((575, quote_y + 8), "— Spiritual significance given by the Mother", font=font(ARIAL, 19), fill="#78643f")

    flower = Image.open(FLOWER).convert("RGBA")
    flower.thumbnail((230, 230), Image.Resampling.LANCZOS)
    shadow = Image.new("RGBA", (270, 270), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse((30, 215, 240, 250), fill=(63, 43, 18, 40))
    canvas.paste(shadow, (1255, 625), shadow)
    canvas.paste(flower, (1275 + (230 - flower.width) // 2, 635 + (230 - flower.height) // 2), flower)

    centered(draw, (980, 870), "15 AUGUST 2026 · DARSHAN DAY", font(ARIAL_BOLD, 28), "#173846")
    centered(draw, (980, 915), "OFFERING 0001 · SAMPLE CERTIFICATE", font(ARIAL, 20), "#8b6a35")
    centered(draw, (800, 992), "With gratitude and aspiration", font(GEORGIA_ITALIC, 24), "#173846")
    centered(draw, (800, 1026), "Presented by Sri Aurobindo Society, Lucknow · Gomti Nagar", font(ARIAL, 15), "#756340")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT, format="PNG", optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
