from html.parser import HTMLParser
from pathlib import Path


SOURCE = Path(__file__).with_name("screen-designs-standalone.html")
DESTINATION = Path(
    r"C:\Users\Meghna\.codex\visualizations\2026\07\29\019faca7-3ea8-7033-88a9-1794b69e2090\sas-lucknow-android-screens.html"
)


class IframeSourceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.srcdoc = ""

    def handle_starttag(self, tag, attrs):
        if tag == "iframe":
            self.srcdoc = dict(attrs).get("srcdoc", "")


class RootBoundsParser(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.source = source
        self.lines = source.splitlines(keepends=True)
        self.offsets = []
        cursor = 0
        for line in self.lines:
            self.offsets.append(cursor)
            cursor += len(line)
        self.started = False
        self.depth = 0
        self.start = None
        self.end = None

    def absolute_position(self):
        line, column = self.getpos()
        return self.offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        if tag == "div" and not self.started and dict(attrs).get("id") == "sas-android-board":
            self.started = True
            self.start = self.absolute_position()
        if self.started and tag == "div":
            self.depth += 1

    def handle_endtag(self, tag):
        if self.started and tag == "div":
            self.depth -= 1
            if self.depth == 0 and self.end is None:
                self.end = self.absolute_position() + len("</div>")


outer = SOURCE.read_text(encoding="utf-8")
iframe = IframeSourceParser()
iframe.feed(outer)
if not iframe.srcdoc:
    raise RuntimeError("The standalone preview does not contain an iframe srcdoc.")

bounds = RootBoundsParser(iframe.srcdoc)
bounds.feed(iframe.srcdoc)
if bounds.start is None or bounds.end is None:
    raise RuntimeError("Could not locate the sas-android-board fragment.")

fragment = iframe.srcdoc[bounds.start : bounds.end].strip() + "\n"
if "<!doctype" in fragment.lower() or "<html" in fragment.lower() or "<body" in fragment.lower():
    raise RuntimeError("Extraction produced a standalone document instead of a fragment.")

DESTINATION.parent.mkdir(parents=True, exist_ok=True)
DESTINATION.write_text(fragment, encoding="utf-8")
print(DESTINATION)
print(f"{len(fragment)} bytes")
