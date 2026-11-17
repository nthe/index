#!/usr/bin/env python3
"""Check that the published SVG preserves the survey's Sankey flows."""
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1] / "talks/codecon-26"
source = (root / "diagrams/evidence.mmd").read_text().splitlines()[1:]
aliases = {
    "All products": "Products",
    "Numeric token reduction claim": "Numerical author token claim",
    "No numeric token claim recorded": "No numerical token claim recorded",
    "Cost reduced only": "Cost reduced only",
    "Mixed cost results": "Mixed cost results",
    "Cost increased only": "Cost increased only",
    "Modeled or incomplete savings": "Modeled or incomplete savings",
    "No qualifying cost result": "No qualifying cost result",
}
expected = {}
for line in source:
    start, end, value = line.split(",")
    expected[(aliases[start].lower(), aliases[end].lower())] = int(value)

svg = ET.parse(root / "research/evidence-sankey.svg").getroot()
ns = {"s": "http://www.w3.org/2000/svg"}
actual = {}
for path in svg.findall('.//s:path[@class="pele-sankey-link"]', ns):
    title = path.find("s:title", ns).text
    edge, value = title.rsplit(": ", 1)
    start, end = edge.lower().split(" → ")
    actual[(start, end)] = int(value)
assert actual == expected, "Sankey flows do not match the Mermaid source"
assert '--_fg:#111' in svg.get('style', ''), "Sankey labels must be dark"
labels = svg.find('.//s:g[@class="pele-labels"]', ns)
assert labels is not None and labels.get('fill') == '#111', "Sankey labels must be dark"
label_counts = {
    "Products": 128,
    "Numeric claims": 93,
    "Verbal claims": 35,
    "No evidence": 114,
    "Reduced": 3,
    "Mixed": 4,
    "Partial": 4,
    "Increased": 3,
}
for node in labels.findall('s:g', ns):
    label = ''.join(node.itertext()).strip()
    assert label.endswith(str(label_counts[node.get('data-id')])), f"Wrong label: {label}"
assert len(labels.findall('s:g', ns)) == len(label_counts), "Sankey labels are incomplete"
print("Sankey flows, labels and color verified.")
