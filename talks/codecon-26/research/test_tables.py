from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).parent
HTML = (ROOT / "index.html").read_text()
CSS = (ROOT / "styles.css").read_text()


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = {}
        self.active_table = None
        self.in_body = False
        self.row_columns = 0
        self.in_row = False
        self.disclosure_depth = 0
        self.disclosures = 0
        self.searches = []
        self.regions = []
        self.cues = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "details" and "table-disclosure" in attrs.get("class", "").split():
            assert "open" not in attrs, "Table sections must start closed"
            self.disclosures += 1
            self.disclosure_depth += 1
        elif tag == "table" and attrs.get("id") in ("independent-table", "overview-table"):
            self.active_table = attrs["id"]
            self.tables[self.active_table] = []
        elif tag == "tbody" and self.active_table:
            self.in_body = True
        elif tag == "tr" and self.in_body:
            self.in_row = True
            self.row_columns = 0
        elif tag == "td" and self.in_row:
            self.row_columns += 1
        elif tag == "input" and attrs.get("data-table"):
            self.searches.append((attrs["data-table"], self.disclosure_depth))
        elif tag == "div" and "table-scroll" in attrs.get("class", "").split():
            self.regions.append(attrs.get("aria-describedby"))
        elif tag == "p" and attrs.get("class") == "scroll-cue":
            self.cues.add(attrs.get("id"))

    def handle_endtag(self, tag):
        if tag == "details" and self.disclosure_depth:
            self.disclosure_depth -= 1
        elif tag == "tr" and self.in_row:
            self.tables[self.active_table].append(self.row_columns)
            self.in_row = False
        elif tag == "tbody":
            self.in_body = False
        elif tag == "table" and self.active_table:
            self.active_table = None


parser = TableParser()
parser.feed(HTML)
assert parser.tables["independent-table"] == [6] * 130
assert parser.tables["overview-table"] == [9] * 128
assert parser.disclosures == 2
assert sorted(parser.searches) == [("independent-table", 1), ("overview-table", 1)]
assert set(parser.regions) == parser.cues
assert "130 result rows" in HTML and "128 products" in HTML
assert 'aria-live="polite"' in HTML
assert "cell.childNodes.forEach((node) => description.append(node.cloneNode(true)))" in HTML
assert "headers[index].textContent" in HTML
assert "row.dataset.searchText.includes(query)" in HTML
assert "window.addEventListener('hashchange', revealLinkedTable)" in HTML
assert "max-height: min(32rem, 70vh)" in CSS
assert "overflow-x: auto; overflow-y: auto" in CSS
assert ".data-table th { position: sticky; top: 0;" in CSS
assert ".row-details { display: block;" in CSS
print("Research table UX checks passed.")
