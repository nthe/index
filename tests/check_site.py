#!/usr/bin/env python3
"""Check local HTML links and the survey's product count."""
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.table = None
        self.overview_rows = 0

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "a" and attrs.get("name"):
            self.ids.add(attrs["name"])
        if tag == "table":
            self.table = attrs.get("id")
        if tag == "tr" and self.table == "overview-table":
            self.overview_rows += 1
        for key in ("href", "src"):
            if key in attrs and attrs[key]:
                self.links.append(attrs[key])

    def handle_endtag(self, tag):
        if tag == "table":
            self.table = None


pages = {}
for path in ROOT.rglob("*.html"):
    page = Page()
    page.feed(path.read_text(encoding="utf-8"))
    pages[path.resolve()] = page

errors = []
for path, page in pages.items():
    if not any(link.endswith("/assets/theme.css") or link == "assets/theme.css" for link in page.links):
        errors.append(f"{path.relative_to(ROOT)}: missing theme stylesheet")
    if not any(link.endswith("/assets/theme.js") or link == "assets/theme.js" for link in page.links):
        errors.append(f"{path.relative_to(ROOT)}: missing theme script")
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            continue
        target = ((ROOT if url.path.startswith("/") else path.parent) / unquote(url.path).lstrip("/")).resolve() if url.path else path
        if not target.is_relative_to(ROOT):
            errors.append(f"{path.relative_to(ROOT)}: link leaves site: {link}")
            continue
        if target.is_dir():
            target = target / "index.html"
        if not target.exists():
            errors.append(f"{path.relative_to(ROOT)}: missing: {link}")
        elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
            errors.append(f"{path.relative_to(ROOT)}: missing fragment: {link}")

survey = pages[ROOT / "talks/codecon-26/research/index.html"]
if survey.overview_rows != 129:  # one header plus 128 products
    errors.append(f"Survey: expected 128 products, got {survey.overview_rows - 1}")

sensitive = re.compile(
    r"/(?:Users|home)/[^\s\"'<>\\)]+"
    r"|\b[A-Z]:\\Users\\[^\s\"'<>]+"
    r"|\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b"
    r"|\b(?:ghp_|github_pat_|sk-)[a-zA-Z0-9_-]{20,}"
    r"|-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----",
    re.IGNORECASE,
)
for name in ("index.html", "session.html"):
    path = ROOT / "talks/codecon-26/one-shot" / name
    if sensitive.search(unescape(path.read_text(encoding="utf-8"))):
        errors.append(f"{path.relative_to(ROOT)}: possible sensitive data")
if errors:
    print("\n".join(errors))
    raise SystemExit(1)
print(f"OK: {len(pages)} HTML pages, local links and 128 survey products")
