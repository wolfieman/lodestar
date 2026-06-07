"""Build the multi-resolution favicon.ico (16 + 32) from the rasterized PNGs.

Run after ``node assets/favicon/generate.mjs``. Requires Pillow.
"""

from pathlib import Path

from PIL import Image

STATIC = Path(__file__).resolve().parents[2] / "src" / "lodestar" / "static"

img32 = Image.open(STATIC / "favicon-32.png")
img16 = Image.open(STATIC / "favicon-16.png")

ico = STATIC / "favicon.ico"
img32.save(ico, format="ICO", sizes=[(16, 16), (32, 32)], append_images=[img16])

embedded = sorted(Image.open(ico).info["sizes"])
print(f"wrote {ico.name} with sizes {embedded}")
assert embedded == [(16, 16), (32, 32)], embedded
