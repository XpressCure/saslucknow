from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pushpanjali-certificate-sample.png"
BACKGROUND = ROOT / "public" / "pushpanjali-certificate-ornamental-bg.png"
PORTRAIT = ROOT / "public" / "pushpanjali-sri-aurobindo.jpg"
FLOWER = ROOT / "public" / "pushpanjali-supramental-power-cutout.png"
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
    wash_draw.rounded_rectangle((93, 213, 547, 1000), radius=26, fill=(255, 253, 246, 158))
    wash_draw.rounded_rectangle((570, 210, 1500, 1000), radius=28, fill=(255, 253, 246, 122))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), wash)
    draw = ImageDraw.Draw(canvas)

    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((96, 82), Image.Resampling.LANCZOS)
    society_name = "SRI AUROBINDO SOCIETY · LUCKNOW"
    society_face = font(ARIAL_BOLD, 39)
    society_width = draw.textlength(society_name, font=society_face)
    header_gap = 22
    header_width = logo.width + header_gap + society_width
    header_left = int((width - header_width) / 2)
    society_center = header_left + logo.width + header_gap + society_width / 2
    canvas.paste(logo, (header_left, 73), logo)

    centered(draw, (int(society_center), 112), society_name, society_face, "#173846")
    centered(draw, (int(society_center), 148), "GOMTI NAGAR CENTRE (UC-02)", font(ARIAL_BOLD, 16), "#9a621b")

    portrait_box = (105, 225, 535, 988)
    portrait = Image.open(PORTRAIT).convert("RGB")
    fitted = ImageOps.fit(portrait, (430, 763), method=Image.Resampling.LANCZOS, centering=(0.4, 0.5))
    mask = Image.new("L", fitted.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 429, 762), radius=22, fill=255)
    canvas.paste(fitted, (105, 225), mask)
    draw.rounded_rectangle(portrait_box, radius=22, outline="#c99a51", width=3)

    draw.rounded_rectangle((127, 247, 357, 327), radius=10, fill=(16, 43, 56, 218))
    draw.text((145, 257), "Sri Aurobindo", font=font(GEORGIA, 26), fill="#fffdf7")
    draw.text((145, 293), "1872–1950", font=font(ARIAL_BOLD, 16), fill="#e8c884")

    content_left, content_right = 600, 1475
    content_center = (content_left + content_right) // 2
    centered(draw, (content_center, 275), "Certificate of Pushpanjali", font(GEORGIA_BOLD, 34), "#173846")
    draw.line((content_center - 240, 300, content_center + 240, 300), fill="#c89c56", width=2)
    centered(draw, (content_center, 345), "This certifies that", font(ARIAL, 19), "#4b5c62")
    centered(draw, (content_center, 420), "Sample Devotee", font(GEORGIA_ITALIC, 66), "#a66a16")
    draw.line((790, 441, 1285, 441), fill="#a86d27", width=2)

    centered(draw, (content_center, 497), "has lovingly offered Pushpanjali to Sri Aurobindo", font(GEORGIA, 23), "#455b63")
    centered(draw, (content_center, 542), "on his 154th Birthday.", font(GEORGIA_BOLD, 26), "#a86d27")

    draw.text((content_left, 610), "Flower Offered", font=font(GEORGIA_BOLD, 28), fill="#173846")
    draw.text((content_left, 650), "BOTANICAL NAME / VARIETY", font=font(ARIAL_BOLD, 12), fill="#78643f")
    draw.text((content_left, 675), "Hibiscus rosa-sinensis ‘Rukmini’ · deep gold, double", font=font(ARIAL, 15), fill="#4b5c62")
    draw.text((content_left, 710), "SPIRITUAL SIGNIFICANCE GIVEN BY THE MOTHER", font=font(ARIAL_BOLD, 13), fill="#78643f")
    quote_face = font(GEORGIA_ITALIC, 21)
    quote_lines = wrap(draw, "“Organising and active, irresistible in its influence.”", quote_face, 575)
    quote_y = 738
    for line in quote_lines:
        draw.text((content_left, quote_y), line, font=quote_face, fill="#4b5c62")
        quote_y += 31

    draw.text((content_left, 795), "Power of the Supramental Consciousness", font=font(GEORGIA_BOLD, 25), fill="#a86d27")

    flower = Image.open(FLOWER).convert("RGBA")
    flower.thumbnail((220, 220), Image.Resampling.LANCZOS)
    flower_x = 1235 + (220 - flower.width) // 2
    flower_y = 610 + (220 - flower.height) // 2
    canvas.paste(flower, (flower_x, flower_y), flower)

    draw.line((content_left, 855, content_right, 855), fill="#d5b476", width=2)
    centered(draw, (content_center, 920), "15 AUGUST 2026  |  DARSHAN DIVAS", font(ARIAL_BOLD, 28), "#173846")
    centered(draw, (content_center, 974), "CERTIFICATE NUMBER: UC02-000001", font(ARIAL_BOLD, 21), "#8b6a35")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT, format="PNG", optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
