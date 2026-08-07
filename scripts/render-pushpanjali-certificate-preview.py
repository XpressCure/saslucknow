from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pushpanjali-certificate-sample.png"
BACKGROUND = ROOT / "public" / "pushpanjali-certificate-ornamental-bg.png"
PORTRAIT = ROOT / "public" / "pushpanjali-sri-aurobindo.jpg"
FLOWER = ROOT / "public" / "pushpanjali-divine-love-cutout.png"
LOGO = ROOT / "public" / "society-logo-transparent.png"

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
    width, height = 1600, 1130
    background = Image.open(BACKGROUND).convert("RGB")
    canvas = ImageOps.fit(background, (width, height), method=Image.Resampling.LANCZOS)

    wash = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    wash_draw = ImageDraw.Draw(wash)
    wash_draw.rounded_rectangle((93, 213, 547, 927), radius=26, fill=(255, 253, 246, 158))
    wash_draw.rounded_rectangle((570, 210, 1500, 1000), radius=28, fill=(255, 253, 246, 122))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), wash)
    draw = ImageDraw.Draw(canvas)

    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((110, 94), Image.Resampling.LANCZOS)
    canvas.paste(logo, (86, 75), logo)

    centered(draw, (800, 112), "SRI AUROBINDO SOCIETY · LUCKNOW", font(ARIAL_BOLD, 32), "#173846")
    centered(draw, (800, 148), "GOMTI NAGAR CENTRE (UC-02)", font(ARIAL_BOLD, 18), "#9a621b")

    portrait_box = (105, 225, 535, 915)
    portrait = Image.open(PORTRAIT).convert("RGB")
    fitted = ImageOps.fit(portrait, (430, 690), method=Image.Resampling.LANCZOS, centering=(0.5, 0.48))
    mask = Image.new("L", fitted.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 429, 689), radius=22, fill=255)
    canvas.paste(fitted, (105, 225), mask)
    draw.rounded_rectangle(portrait_box, radius=22, outline="#c99a51", width=3)

    draw.rounded_rectangle((127, 247, 357, 327), radius=10, fill=(16, 43, 56, 218))
    draw.text((145, 257), "Sri Aurobindo", font=font(GEORGIA, 26), fill="#fffdf7")
    draw.text((145, 293), "1872–1950", font=font(ARIAL_BOLD, 16), fill="#e8c884")

    content_left, content_right = 600, 1475
    content_center = (content_left + content_right) // 2
    centered(draw, (content_center, 265), "Certificate of Pushpanjali", font(GEORGIA_BOLD, 55), "#173846")
    draw.line((content_center - 240, 300, content_center + 240, 300), fill="#c89c56", width=2)
    centered(draw, (content_center, 338), "This certifies that", font(ARIAL, 23), "#4b5c62")
    centered(draw, (content_center, 408), "Sample Devotee", font(GEORGIA_ITALIC, 58), "#a66a16")
    draw.line((790, 441, 1285, 441), fill="#a86d27", width=2)

    centered(draw, (content_center, 487), "has lovingly offered Pushpanjali to Sri Aurobindo", font(GEORGIA, 25), "#455b63")
    centered(draw, (content_center, 532), "on his 154th Birthday", font(GEORGIA_BOLD, 29), "#a86d27")

    draw.text((content_left, 595), "Divine Love", font=font(GEORGIA_BOLD, 36), fill="#a86d27")
    draw.text((content_left, 649), "SPIRITUAL SIGNIFICANCE GIVEN BY THE MOTHER", font=font(ARIAL_BOLD, 16), fill="#78643f")
    quote_face = font(GEORGIA_ITALIC, 27)
    quote_lines = wrap(draw, "“A flower that is said to blossom even in the desert.”", quote_face, 575)
    quote_y = 697
    for line in quote_lines:
        draw.text((content_left, quote_y), line, font=quote_face, fill="#4b5c62")
        quote_y += 38

    flower = Image.open(FLOWER).convert("RGBA")
    flower.thumbnail((220, 220), Image.Resampling.LANCZOS)
    flower_x = 1235 + (220 - flower.width) // 2
    flower_y = 590 + (220 - flower.height) // 2
    canvas.paste(flower, (flower_x, flower_y), flower)

    draw.line((content_left, 855, content_right, 855), fill="#d5b476", width=2)
    centered(draw, (content_center, 910), "15 AUGUST 2026  |  DARSHAN DIVAS", font(ARIAL_BOLD, 28), "#173846")
    centered(draw, (content_center, 965), "CERTIFICATE NUMBER: UC02-000001", font(ARIAL_BOLD, 21), "#8b6a35")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT, format="PNG", optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
