#!/usr/bin/env python3
"""Check chart SVG labels, accessible names, and contrast."""

from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET


HERE = Path(__file__).parent
SVG = "{http://www.w3.org/2000/svg}"
CHARTS = {
    "claims-vs-independent.svg": (
        "Context Mode",
        "Headroom",
        "Token Savior",
        "RTK",
    ),
    "positive-claims-vs-independent.svg": (
        "Caveman",
        "Ponytail",
        "Microsoft",
        "TokenEconomizer",
        "Spotify Shunt",
    ),
}


def luminance(color: str) -> float:
    channels = [int(color[index : index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in channels]
    return sum(channel * weight for channel, weight in zip(linear, (0.2126, 0.7152, 0.0722)))


def contrast(first: str, second: str) -> float:
    high, low = sorted((luminance(first), luminance(second)), reverse=True)
    return (high + 0.05) / (low + 0.05)


class ClaimsChartTests(unittest.TestCase):
    def test_svg_accessibility_and_contrast(self) -> None:
        for filename, labels in CHARTS.items():
            with self.subTest(chart=filename):
                root = ET.parse(HERE / filename).getroot()
                self.assertEqual(root.attrib.get("viewBox"), "0 0 972 504")
                self.assertEqual(root.attrib.get("role"), "img")
                self.assertEqual(root.attrib.get("aria-labelledby"), "chart-title chart-description")
                self.assertIsNotNone(root.find(f"{SVG}title"))
                self.assertIsNotNone(root.find(f"{SVG}desc"))
                style = root.find(f"{SVG}style")
                self.assertIsNotNone(style)
                self.assertIn("opacity: 1 !important", style.text)

                background = root.find(f"{SVG}rect[@class='chart-background']")
                self.assertIsNotNone(background)
                self.assertEqual(background.attrib.get("fill"), "#ffffff")
                self.assertEqual((background.attrib.get("width"), background.attrib.get("height")), ("972", "504"))

                all_text = " ".join("".join(node.itertext()) for node in root.iter(f"{SVG}text"))
                for label in labels:
                    self.assertIn(label, all_text)

                for node in root.iter(f"{SVG}text"):
                    match = re.search(r"(?:^|;)\s*fill:\s*(#[0-9a-fA-F]{6})", node.attrib.get("style", ""))
                    self.assertIsNotNone(match, "Text must have a fixed, readable fill color")
                    self.assertGreaterEqual(contrast(match.group(1), "#ffffff"), 4.5)

                self.assertGreaterEqual(contrast("#006b83", "#ffffff"), 3)
                self.assertGreaterEqual(contrast("#965200", "#ffffff"), 3)

    def test_published_page_has_charts_and_text_alternatives(self) -> None:
        page = (HERE / "index.html").read_text(encoding="utf-8")
        css = (HERE / "styles.css").read_text(encoding="utf-8")
        for filename in CHARTS:
            self.assertIn(f'src="{filename}"', page)
        for required in (
            'class="survey-chart"',
            'class="chart-details"',
            'role="region"',
            'tabindex="0"',
            'not matched replications',
            'Bytes are not tokens.',
            'separate Shunt-inspired implementation',
            'largest reduction',
        ):
            with self.subTest(required=required):
                self.assertIn(required, page)
        self.assertIn('.comparison-chart img { min-width: 700px; }', css)


if __name__ == "__main__":
    unittest.main()
