from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent / "pdf-render-v2"
pages = sorted(root.glob("page-*.png"))
for start in range(0, len(pages), 9):
    chunk = pages[start:start + 9]
    thumbs = []
    for page in chunk:
        image = Image.open(page).convert("RGB")
        image.thumbnail((360, 470))
        thumbs.append((page.name, image.copy()))
    sheet = Image.new("RGB", (1160, 1560), "#d9dde0")
    draw = ImageDraw.Draw(sheet)
    for index, (name, image) in enumerate(thumbs):
        col = index % 3
        row = index // 3
        x = 20 + col * 380
        y = 40 + row * 505
        sheet.paste(image, (x, y))
        draw.text((x, y - 24), name, fill="#123847")
    sheet.save(Path(__file__).resolve().parent / f"pdf-contact-v2-{start + 1:02d}.png")
