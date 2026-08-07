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
    logo.thumbnail((90, 77), Image.Resampling.LANCZOS)
    canvas.paste(logo, (82, 72))

    centered(draw, (800, 108), "SRI AUROBINDO SOCIETY · LUCKNOW", font(ARIAL_BOLD, 30), "#173846")
    centered(draw, (800, 145), "GOMTI NAGAR CENTRE (UC-02)", font(ARIAL, 19), "#a86d27")
    draw.line((105, 174, 1495, 174), fill="#d5b476", width=2)

    portrait_box = (92, 210, 522, 910)
    portrait = Image.open(PORTRAIT).convert("RGB")
    fitted = ImageOps.fit(portrait, (430, 700), method=Image.Resampling.LANCZOS, centering=(0.5, 0.48))
    mask = Image.new("L", fitted.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 429, 699), radius=22, fill=255)
    canvas.paste(fitted, (92, 210), mask)
    draw.rounded_rectangle(portrait_box, radius=22, outline="#c99a51", width=3)

    draw.rounded_rectangle((114, 232, 344, 312), radius=10, fill=(16, 43, 56, 205))
    draw.text((132, 242), "Sri Aurobindo", font=font(GEORGIA, 26), fill="#fffdf7")
    draw.text((132, 278), "1872–1950", font=font(ARIAL_BOLD, 16), fill="#e8c884")

    content_left, content_right = 585, 1490
    content_center = (content_left + content_right) // 2
    centered(draw, (content_center, 242), "Certificate of Pushpanjali", font(GEORGIA, 58), "#173846")
    centered(draw, (content_center, 310), "This certifies that", font(ARIAL, 23), "#4b5c62")
    centered(draw, (content_center, 375), "Sample Devotee", font(GEORGIA, 54), "#173846")
    draw.line((760, 402, 1315, 402), fill="#a86d27", width=2)

    centered(draw, (content_center, 450), "has lovingly offered Pushpanjali to Sri Aurobindo", font(GEORGIA, 26), "#455b63")
    centered(draw, (content_center, 500), "on his 154th Birthday", font(GEORGIA_BOLD, 29), "#a86d27")

    draw.text((content_left, 558), "Divine Love", font=font(GEORGIA_BOLD, 36), fill="#a86d27")
    draw.text((content_left, 612), "SPIRITUAL SIGNIFICANCE GIVEN BY THE MOTHER", font=font(ARIAL_BOLD, 16), fill="#78643f")
    quote_face = font(GEORGIA_ITALIC, 27)
    quote_lines = wrap(draw, "“A flower that is said to blossom even in the desert.”", quote_face, 610)
    quote_y = 660
    for line in quote_lines:
        draw.text((575, quote_y), line, font=quote_face, fill="#4b5c62")
        quote_y += 38

    flower = Image.open(FLOWER).convert("RGBA")
    flower.thumbnail((240, 240), Image.Resampling.LANCZOS)
    shadow = Image.new("RGBA", (270, 270), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse((30, 215, 240, 250), fill=(63, 43, 18, 40))
    canvas.paste(shadow, (1225, 545), shadow)
    canvas.paste(flower, (1245 + (240 - flower.width) // 2, 555 + (240 - flower.height) // 2), flower)

    draw.line((content_left, 835, content_right, 835), fill="#d5b476", width=2)
    centered(draw, (content_center, 925), "15 AUGUST 2026  |  DARSHAN DIVAS", font(ARIAL_BOLD, 28), "#173846")
    centered(draw, (content_center, 982), "CERTIFICATE NUMBER: UC02-000001", font(ARIAL_BOLD, 21), "#8b6a35")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT, format="PNG", optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
