# index

This is a static site. Serve the repository root with any static HTTP server.

The two flowcharts use Mermaid sources in `talks/codecon-26/diagrams/`. To render them with Pele and run the checks:

```sh
npm ci
npm run diagrams
npm run check
```

The published pages use SVG graphics and do not load a diagram renderer. The research charts are adapted from the survey SVG files. The Sankey data is in `talks/codecon-26/diagrams/evidence.mmd`; the check compares it with the published SVG.