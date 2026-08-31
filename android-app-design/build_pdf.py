from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output" / "pdf" / "SAS-Lucknow-Android-App-Product-Blueprint.pdf"
ASSETS = ROOT / "assets"
PUBLIC = ROOT.parent / "public"

INK = colors.HexColor("#123847")
INK2 = colors.HexColor("#1C4B5A")
CREAM = colors.HexColor("#FBF7EE")
PAPER = colors.HexColor("#FFFDF8")
GOLD = colors.HexColor("#C99034")
GOLD_LIGHT = colors.HexColor("#F1CF82")
SAGE = colors.HexColor("#DCE9DF")
MUTED = colors.HexColor("#5B6F77")
LINE = colors.HexColor("#E4D1A9")

pdfmetrics.registerFont(TTFont("SASSerif", "C:/Windows/Fonts/georgia.ttf"))
pdfmetrics.registerFont(TTFont("SASSerif-Bold", "C:/Windows/Fonts/georgiab.ttf"))
pdfmetrics.registerFont(TTFont("SASSans", "C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont("SASSans-Bold", "C:/Windows/Fonts/arialbd.ttf"))


def styles():
    return {
        "kicker": ParagraphStyle("Kicker", fontName="SASSans-Bold", fontSize=8.5, leading=11, textColor=GOLD, spaceAfter=6, tracking=1.4),
        "title": ParagraphStyle("Title", fontName="SASSerif-Bold", fontSize=28, leading=31, textColor=INK, alignment=TA_CENTER, spaceAfter=8),
        "subtitle": ParagraphStyle("Subtitle", fontName="SASSerif", fontSize=13, leading=18, textColor=GOLD, alignment=TA_CENTER, spaceAfter=16),
        "h1": ParagraphStyle("H1", fontName="SASSerif-Bold", fontSize=20, leading=24, textColor=INK, spaceBefore=8, spaceAfter=9),
        "h2": ParagraphStyle("H2", fontName="SASSans-Bold", fontSize=12.5, leading=16, textColor=GOLD, spaceBefore=8, spaceAfter=5),
        "h3": ParagraphStyle("H3", fontName="SASSerif-Bold", fontSize=12, leading=15, textColor=INK, spaceBefore=4, spaceAfter=4),
        "body": ParagraphStyle("Body", fontName="SASSans", fontSize=9.6, leading=14.2, textColor=INK, spaceAfter=7),
        "small": ParagraphStyle("Small", fontName="SASSans", fontSize=8.2, leading=11.2, textColor=MUTED, spaceAfter=4),
        "card": ParagraphStyle("Card", fontName="SASSans", fontSize=8.8, leading=12.5, textColor=INK, spaceAfter=3),
        "cardtitle": ParagraphStyle("CardTitle", fontName="SASSerif-Bold", fontSize=12.5, leading=15, textColor=INK, spaceAfter=3),
        "center": ParagraphStyle("Center", fontName="SASSans", fontSize=9.2, leading=13, textColor=INK, alignment=TA_CENTER, spaceAfter=7),
    }


S = styles()


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.line(0.72 * inch, height - 0.52 * inch, width - 0.72 * inch, height - 0.52 * inch)
    canvas.setFont("SASSans-Bold", 7.3)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.72 * inch, height - 0.39 * inch, "SAS LUCKNOW  /  ANDROID APP BLUEPRINT")
    canvas.setFont("SASSans", 7.3)
    canvas.drawRightString(width - 0.72 * inch, 0.38 * inch, f"AUGUST 2026   |   {doc.page}")
    canvas.restoreState()


def cover(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(INK)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setFillColor(GOLD_LIGHT)
    canvas.circle(width * 0.77, height * 0.76, 1.55 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#E8AF42"))
    canvas.circle(width * 0.77, height * 0.76, 0.72 * inch, stroke=0, fill=1)
    canvas.setFillColor(PAPER)
    canvas.setFont("SASSans-Bold", 9)
    canvas.drawString(0.8 * inch, height - 0.85 * inch, "SRI AUROBINDO SOCIETY · LUCKNOW CENTRE")
    canvas.setFont("SASSerif-Bold", 31)
    canvas.drawString(0.8 * inch, height - 2.25 * inch, "SAS Lucknow")
    canvas.drawString(0.8 * inch, height - 2.72 * inch, "Android App")
    canvas.setFont("SASSerif", 15)
    canvas.setFillColor(GOLD_LIGHT)
    canvas.drawString(0.8 * inch, height - 3.18 * inch, "Product blueprint and first screen design system")
    canvas.setFillColor(SAGE)
    canvas.setFont("SASSans", 10)
    text = canvas.beginText(0.8 * inch, height - 4.1 * inch)
    text.setLeading(16)
    text.textLine("A calm digital home for study, meditation, community")
    text.textLine("and shared work - rooted in The Song of Life.")
    canvas.drawText(text)
    canvas.setFillColor(PAPER)
    canvas.setFont("SASSans-Bold", 9)
    canvas.drawString(0.8 * inch, 0.8 * inch, "PRODUCT DESIGN DRAFT · AUGUST 2026")
    canvas.restoreState()


def callout(title, text, fill=SAGE):
    body = [Paragraph(title.upper(), S["kicker"]), Paragraph(text, S["cardtitle"])]
    t = Table([[body]], colWidths=[6.3 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill),
        ("BOX", (0, 0), (-1, -1), 0.8, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 14), ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    return t


def image(path, width=6.3 * inch):
    im = Image(str(path), width=width, height=width * 0.61)
    im.hAlign = "CENTER"
    return im


def screen_card(number, title, purpose, shows, action, leads):
    top = Table([[Paragraph(f"SCREEN {number:02d}", S["kicker"]), Paragraph(title, S["cardtitle"])]], colWidths=[1.0 * inch, 5.1 * inch])
    top.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CREAM), ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    details = Paragraph(
        f"{purpose}<br/><font color='#C99034'><b>Shows:</b></font> {shows}<br/>"
        f"<font color='#C99034'><b>Primary action:</b></font> {action}<br/>"
        f"<font color='#C99034'><b>Leads to:</b></font> {leads}", S["card"]
    )
    return KeepTogether([top, Spacer(1, 5), details, Spacer(1, 8)])


PUBLIC_SCREENS = [
    (1, "Splash and secure restore", "Restores an existing session and establishes immediate identity.", "Transparent logo, golden aura and short loading state.", "Continue automatically", "Public Home or Member Dashboard"),
    (2, "Public Home - The Song of Life", "Introduces the vision without compressing the full website.", "Hero, current invitation, Savitri, Sunday meeting and quick paths.", "Begin exploring", "Explore or Join Community"),
    (3, "Explore", "Groups public content into understandable paths.", "Sri Aurobindo, The Mother, Darshan Divas, events, library and locations.", "Open a path", "Selected public detail"),
    (4, "Pushpanjali offering", "Creates a mobile-first flower offering.", "Portrait, offering count, identity fields and three flowers with meanings.", "Offer Pushpanjali", "Certificate success"),
    (5, "Pushpanjali certificate", "Makes the full certificate visible before actions.", "Preview, download, share, Join Community and Contribute.", "Join the Community", "Prefilled account creation"),
    (6, "Join the Community", "Creates the account immediately and records Parichay.", "Name, mobile, email, city, interests, password and consent.", "Create my member account", "Member Dashboard"),
    (7, "Member Login", "Provides a fast return path.", "Email/mobile, password, visibility control and recovery.", "Enter member space", "Member Dashboard"),
    (8, "Support the Work", "Collects details before secure provider hand-off.", "Purpose, amount, donor details, consent and provider status.", "Continue securely", "Razorpay, receipt and Yogdaan"),
]

MEMBER_SCREENS = [
    (9, "Member Dashboard", "Orients the member without a metric wall.", "Resume card, next action, notification, Sankalp and weekly silence.", "Continue", "Last meaningful activity"),
    (10, "Darshan Hub", "Presents six inward spaces as one family.", "Inner Room, Inner Sound, Watch, Sangha, e-Library and Savitri Sakhi.", "Choose a space", "Selected Darshan destination"),
    (11, "Inner Room - setup", "Prepares silence without distraction.", "Matrimandir focus, duration, music and volume.", "Begin", "Full-screen meditation"),
    (12, "Inner Room - session", "Removes normal navigation for the selected period.", "Breathing aureole, timer and subtle pause/end controls.", "End gently", "Optional private reflection"),
    (13, "Inner Sound", "Feels curated rather than a grid of identical buttons.", "Now playing, Morning/Evening/States/Duration, playlists and infinite mode.", "Begin listening", "Audio player or Inner Room"),
    (14, "Watch Library", "Combines Song of Savitri and Gatherings.", "Search, collection tabs, Watch Later, Bookmarked and YouTube thumbnails.", "Open video", "Video detail"),
    (15, "Video Detail", "Turns viewing into attentive study.", "Player, reference, transcript search, bookmark, saved moment and private note.", "Save this moment", "Timestamped bookmark"),
    (16, "Sangha Feed", "Creates a calm member-only social rhythm.", "Latest first, IST time, five post types, filters and line-break preservation.", "Share with Sangha", "Composer or post detail"),
    (17, "Create Post or Poll", "Makes posting compact and clear.", "1,000 words, optional photo/video, and polls with 2-4 short options.", "Publish", "Sangha Feed"),
    (18, "e-Library", "Supports discovery and return-to-study.", "Full-text search, source filters, recent reading and My Bookmarks.", "Open reading", "Reader at saved position"),
    (19, "Savitri Sakhi", "Offers bilingual study with references and saved history.", "English/Hindi prompt, line lookup, recent conversations and source actions.", "Ask", "Referenced answer"),
    (20, "Sankalp", "Explains collective work before asking for support.", "Purpose, stage, participants, progress narrative and rules.", "Offer Seva", "Contribution or participation"),
    (21, "My Yogdaan", "Keeps verified contribution history private.", "Purpose, amount, date, provider reference and acknowledgement.", "View acknowledgement", "Receipt detail"),
    (22, "Parichay", "Makes member identity useful and editable.", "Member ID, contacts, interests, skills, seva and notification choices.", "Save Parichay", "Updated member profile"),
    (23, "Notifications", "Surfaces only relevant updates.", "New media, Sankalp progress, responses, reminders and account notices.", "Open update", "Originating content"),
]


def add_section(story, kicker, title, body=None):
    story += [Paragraph(kicker.upper(), S["kicker"]), Paragraph(title, S["h1"])]
    if body:
        story.append(Paragraph(body, S["body"]))


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(str(OUT), pagesize=letter, leftMargin=0.8 * inch, rightMargin=0.8 * inch, topMargin=0.72 * inch, bottomMargin=0.65 * inch)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="cover", frames=frame, onPage=cover), PageTemplate(id="normal", frames=frame, onPage=header_footer)])
    story = [Spacer(1, 8.6 * inch), NextPageTemplate("normal"), PageBreak()]

    add_section(story, "Executive view", "What we are building", "The SAS Lucknow Android app will be a native mobile doorway into the same ecosystem already available on saslucknow.in. It will not become a second disconnected platform. One account, one Parichay, one Yogdaan record and one set of saved content will serve both website and app.")
    story += [callout("Recommended product position", "Not a smaller website. A quieter, faster and more personal daily companion."), Spacer(1, 12)]
    story += [Paragraph("Who it serves", S["h2"]), Paragraph("Visitors can discover the Centre, join, experience Pushpanjali, watch public videos and support the work. Signed-in members receive a personal dashboard, six Darshan spaces, Sangha, Sankalp, Yogdaan and Parichay.", S["body"])]
    for lead, text in [("Simple", "One obvious next step."), ("Peaceful", "Luminous and composed, never noisy."), ("Personal", "Saved study and activity return with the member."), ("Connected", "The website and app share a source of truth."), ("Trustworthy", "Sensitive data and payments are handled transparently.")]:
        story.append(Paragraph(f"<b>{lead}.</b> {text}", S["body"]))
    story.append(PageBreak())

    add_section(story, "Information architecture", "One app, two journeys", "The public journey welcomes and explains. The member journey remembers and deepens. A visitor crosses into the member space only through login or Join the Community.")
    story += [image(ASSETS / "app-map.png"), Paragraph("Figure 1. Public and signed-in sections.", S["center"]), PageBreak()]
    add_section(story, "Member journey", "From discovery to belonging", "The app never presents the entire system at once. Home introduces the vision; account creation collects only what is needed; the dashboard then offers a small number of meaningful destinations.")
    story += [image(ASSETS / "member-journey.png"), Paragraph("Figure 2. Recommended first-day journey.", S["center"]), callout("Rule for every page", "Show where the member is, what matters now, and one clear next action.", CREAM), PageBreak()]
    add_section(story, "Design language", "The Song of Life, translated to mobile", "The golden sunrise remains the emotional starting point. Deep teal supports attention, warm cream supports reading, luminous gold guides action, and sage softens restorative spaces. Serif headings create dignity; concise sans-serif controls preserve clarity.")
    story += [image(ASSETS / "screen-contact-sheet.png", 6.0 * inch), Paragraph("Figure 3. Representative screens; the interactive board contains the complete set.", S["center"]), PageBreak()]

    add_section(story, "Navigation", "A clean mobile hierarchy", "Public pages use a compact app bar. After login, a four-item bottom navigation keeps Home, Darshan, Sangha and Profile visible. Sankalp, Yogdaan and notifications remain reachable without crowding the core navigation.")
    story.append(Paragraph("Darshan contains six destinations", S["h2"]))
    for title, text in [("The Inner Room", "Guided silence, timer and private reflection."), ("Inner Sound", "Curated contemplative audio."), ("Watch Videos", "Savitri and Gatherings with saved moments."), ("Sangha", "A gentle member feed."), ("e-Library", "Search, read and bookmark."), ("Savitri Sakhi", "Bilingual study companion.")]:
        story.append(Paragraph(f"<b>{title}.</b> {text}", S["body"]))
    story += [callout("Navigation safeguard", "Do not repeat these six destinations as chips, cards and menu entries on the same page."), PageBreak()]

    add_section(story, "Screen designs", "Public and account screens")
    for item in PUBLIC_SCREENS:
        story.append(screen_card(*item))
    story.append(PageBreak())
    add_section(story, "Screen designs", "Member core and Darshan screens")
    for item in MEMBER_SCREENS[:7]:
        story.append(screen_card(*item))
    story.append(PageBreak())
    add_section(story, "Screen designs", "Community, study and service")
    for item in MEMBER_SCREENS[7:]:
        story.append(screen_card(*item))
    story.append(PageBreak())

    add_section(story, "Content and privacy", "What is shared, saved and private")
    for title, text in [
        ("Shared with all visitors", "Vision content, event information, public videos, library previews, Pushpanjali and public contribution invitation."),
        ("Shared with members", "Sangha posts and comments, community notifications, participant counts and approved member media."),
        ("Private to the member", "Parichay, saved reading, bookmarks, meditation minutes, reflections, playlists, chat history and Yogdaan amounts."),
        ("Administrative only", "Moderation, roles, payment verification, publishing, reports and audit history."),
    ]:
        story += [Paragraph(title, S["h2"]), Paragraph(text, S["body"])]
    story += [callout("Privacy promise", "Never turn meditation time, contributions or inner reflections into competitive public metrics."), PageBreak()]

    add_section(story, "Technology", "Recommended implementation", "Use a native Android shell while keeping the existing SAS Lucknow backend as the source of truth.")
    story += [image(ASSETS / "architecture.png"), Paragraph("Figure 4. Recommended Android and backend architecture.", S["center"])]
    story += [Paragraph("Android foundation", S["h2"]), Paragraph("Kotlin, Jetpack Compose, Material 3, ViewModels, coroutines, Retrofit/OkHttp, Room for offline structure, Media3 for audio/video, Credential Manager and encrypted token storage.", S["body"])]
    story += [Paragraph("Backend reuse", S["h2"]), Paragraph("Extend the existing Node.js APIs. MongoDB Atlas remains the primary data store, S3 stores approved media, YouTube supplies video, Razorpay is verified server-side, OpenAI powers Savitri Sakhi and Firebase delivers notifications.", S["body"]), PageBreak()]

    add_section(story, "Security and quality", "Non-negotiable safeguards")
    safeguards = [
        "Never bundle OpenAI, Razorpay secret or database credentials in the APK.",
        "Confirm payments on the server through provider signature verification.",
        "Use short-lived access tokens, safe refresh and remote revocation.",
        "Validate Sangha upload type, size, malware status, S3 access and moderation.",
        "Protect sensitive screens from unsafe recent-app previews where needed.",
        "Test large text, TalkBack, contrast and one-handed use.",
        "Keep every string ready for English and Hindi localization.",
    ]
    for item in safeguards:
        story.append(Paragraph(f"• {item}", S["body"]))
    story += [Paragraph("Offline behaviour", S["h2"]), Paragraph("Cache dashboard summaries, library catalogue, bookmarks and explicitly downloaded audio. Queue drafts safely and never imply that payment or posting succeeded until the server confirms it.", S["body"]), PageBreak()]

    add_section(story, "Delivery plan", "Build in four reviewable phases")
    rows = [["Phase", "Scope", "Review gate"],
            ["1 · Foundation", "Design system, navigation, authentication, API contract and accessibility baseline.", "Clickable prototype"],
            ["2 · Public & identity", "Home, Explore, Pushpanjali, Join, Login and contribution hand-off.", "Internal alpha"],
            ["3 · Darshan & content", "Dashboard, Inner Room, Inner Sound, Watch, e-Library and Savitri Sakhi.", "Closed beta"],
            ["4 · Community & service", "Sangha, Sankalp, Yogdaan, Parichay, hardening and Play Store release.", "Production"]]
    table = Table([[Paragraph(str(v), S["card"]) for v in row] for row in rows], colWidths=[1.25 * inch, 3.7 * inch, 1.35 * inch], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK), ("TEXTCOLOR", (0, 0), (-1, 0), PAPER),
        ("GRID", (0, 0), (-1, -1), 0.6, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [PAPER, CREAM]),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [table, Spacer(1, 12), callout("Recommended first sprint", "Splash, Home, Join Community, Login, Member Dashboard and Darshan Hub - with the shared design system established once."), PageBreak()]

    add_section(story, "Definition of done", "Release acceptance checklist")
    checks = ["Website and app accept the same credentials.", "Every page has a clear back path and meaningful empty state.", "No secret appears in the APK or logs.", "Inner Room suppresses normal distractions and restores safely.", "Bookmarks, reading positions and reflections sync reliably.", "Sangha preserves line breaks, IST times and media.", "Yogdaan changes only after verified payment.", "Small phone, large text, TalkBack and unstable network tests pass.", "Privacy, consent and account deletion paths are ready.", "Play Store data safety, screenshots and support contacts are complete."]
    for index, item in enumerate(checks, 1):
        story.append(Paragraph(f"<b>{index:02d}</b>&nbsp;&nbsp; {item}", S["body"]))
    story += [Spacer(1, 8), callout("Decision requested", "Approve the hierarchy and first visual direction. Development can then begin with a Jetpack Compose navigation prototype.")]
    doc.build(story)
    print(OUT)


if __name__ == "__main__":
    build()
