# Lodestar favicon masters

Source-of-truth SVG masters for the Lodestar favicon suite: a compass-rose +
Cinzel-700 "L" monogram on an ink heraldic shield. The deployed assets in
`src/lodestar/static/` (favicon.svg, favicon-16/32.png, favicon.ico,
apple-touch-icon.png, icon-512.png) are **generated** from these masters and
never hand-edited.

## Files

| File | Role |
| --- | --- |
| `favicon-512.svg` | Full master: gradient shield, blue-hi keyline, 8-point rose at 35%, rose-hi north point, "L". Copied verbatim to `static/favicon.svg`; renders `icon-512.png` and (at 72% on solid `#16304F`) `apple-touch-icon.png`. |
| `favicon-32.svg` | Simplified 32 px master: shield + north point + "L" (rose and keyline dropped — sub-pixel at 32 px). Renders `favicon-32.png`. |
| `favicon-16.svg` | Simplified 16 px master: shield + "L" only. Renders `favicon-16.png`. |
| `generate.mjs` | Rasterizes the masters into `src/lodestar/static/` (needs `@resvg/resvg-js`). |
| `make_ico.py` | Packs `favicon-16.png` + `favicon-32.png` into multi-res `favicon.ico` (needs Pillow). |

## Regenerating

```sh
# from any scratch directory (node 18+):
npm install @resvg/resvg-js
node assets/favicon/generate.mjs      # writes the SVG copy + all PNGs
python assets/favicon/make_ico.py     # packs favicon.ico (pip install pillow)
```

## The "L" monogram

The monogram is Cinzel weight 700, **converted to outlined paths** — the
masters contain no live `<text>`, so rendering needs no fonts. To re-derive it
(e.g. after a glyph change): download `Cinzel[wght].ttf` from the
[google/fonts repo](https://github.com/google/fonts/tree/main/ofl/cinzel)
(SIL Open Font License), instantiate weight 700 with fontTools
(`fonttools varLib.instancer Cinzel[wght].ttf wght=700`), then extract the
glyph path with opentype.js (`font.charToGlyph("L").getPath(x, baseline,
fontSize).toPathData(2)`). Cap height is 700/1000 em; the L sits at ~55% of
shield height, optically centered slightly low so the north point reads above
it. The 32/16 masters bake the same outline slightly larger with a matching
stroke for legibility at small sizes.
