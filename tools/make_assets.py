"""Génère les images statiques du site à partir de site/assets/moon.jpg.

    python tools/make_assets.py FRAUNCES.ttf PLEX_SANS.ttf PLEX_MONO.ttf

- site/assets/moon-poster.webp : Lune pleine, même rendu que le shader de moon3d.js
  (image fixe affichée avant la 3D, et repli sans WebGL).
- site/assets/icon-192.png, icon-512.png, apple-touch-icon.png
- site/assets/og-image.jpg (1200×630) pour Open Graph / Twitter Card.
- site/assets/sky-{800,1280,1920}.webp : fond du hero, à partir de la photo Unsplash
  de Phil Botha (phil-botha-a0TJ3hy-UD8-unsplash.jpg à la racine du projet, si présente).

Dépendances : pip install numpy pillow
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "site" / "assets"
BG = (13, 15, 28)
TEXT = (236, 232, 223)
TEXT_2 = (183, 180, 199)
GOLD = (232, 194, 122)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def render_moon(size, tilt=0.08):
    """Disque lunaire (rayon = 80 % de la demi-taille, comme le shader), éclairé de face. RGBA."""
    tex = np.asarray(Image.open(ASSETS / "moon.jpg").convert("L"), dtype=np.float32) / 255
    th, tw = tex.shape
    c = (np.arange(size) + 0.5) / size * 2 - 1
    x, y = np.meshgrid(c, -c)
    R = 0.8
    r = np.hypot(x, y)
    nx, ny = x / R, y / R
    nz = np.sqrt(np.clip(1 - nx**2 - ny**2, 0, 1))
    ct, st = np.cos(tilt), np.sin(tilt)
    px, py, pz = nx, ct * ny - st * nz, st * ny + ct * nz
    lon = np.arctan2(px, pz)
    lat = np.arcsin(np.clip(py, -1, 1))
    u = ((0.5 + lon / (2 * np.pi)) * tw).astype(int) % tw
    v = np.clip(((0.5 - lat / np.pi) * th).astype(int), 0, th - 1)
    alb = np.clip(tex[v, u] * 1.08, 0.05, 1)
    light = smoothstep(-0.03, 0.22, nz) * (0.62 + 0.38 * nz)
    shade = alb * light * (0.85 + 0.15 * nz)
    px_size = 2 / size
    a = 1 - smoothstep(R - px_size * 1.5, R, r)
    rgb = np.stack([shade * 0.96, shade * 0.94, shade * 0.89], -1)
    out = np.dstack([np.clip(rgb, 0, 1), a]) * 255
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def glow(size, radius, strength=90):
    g = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(g)
    c = size // 2
    d.ellipse((c - radius, c - radius, c + radius, c + radius), fill=strength)
    return g.filter(ImageFilter.GaussianBlur(radius * 0.18))


SKY_PHOTO = ROOT / "phil-botha-a0TJ3hy-UD8-unsplash.jpg"


def make_sky():
    """Fond du hero en trois largeurs (mobile, tablette, ordinateur)."""
    photo = Image.open(SKY_PHOTO).convert("RGB")
    for w in (800, 1280, 1920):
        h = round(w * photo.height / photo.width)
        photo.resize((w, h), Image.LANCZOS).save(ASSETS / f"sky-{w}.webp", quality=62, method=6)


def main(fraunces, plex_sans, plex_mono):
    ASSETS.mkdir(parents=True, exist_ok=True)
    if SKY_PHOTO.exists():
        make_sky()

    render_moon(480).save(ASSETS / "moon-poster.webp", quality=72, method=6)

    for name, size in (("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)):
        icon = Image.new("RGBA", (size, size), BG + (255,))
        moon = render_moon(int(size * 1.18))
        off = (size - moon.width) // 2
        icon.alpha_composite(moon, (off, off))
        icon.convert("RGB").quantize(96, dither=Image.Dither.FLOYDSTEINBERG).save(ASSETS / name, optimize=True)

    W, H = 1200, 630
    og = Image.new("RGBA", (W, H), BG + (255,))
    msize = 700
    halo = Image.new("RGBA", (msize, msize), (237, 222, 184, 0))
    halo.putalpha(glow(msize, int(msize * 0.4), 70))
    mx, my = 760, (H - msize) // 2
    og.alpha_composite(halo, (mx, my))
    og.alpha_composite(render_moon(msize), (mx, my))

    d = ImageDraw.Draw(og)
    serif = ImageFont.truetype(fraunces, 76)
    serif.set_variation_by_axes([72, 400, 0, 0])  # opsz, wght, SOFT, WONK
    sans = ImageFont.truetype(plex_sans, 30)
    try:
        sans.set_variation_by_name("Regular")
    except OSError:
        pass  # police statique
    mono = ImageFont.truetype(plex_mono, 22)
    d.text((80, 150), "PROJET OPEN SOURCE · PYTHON & ASTROPY", font=mono, fill=GOLD)
    d.multiline_text((80, 200), "Moon Phase\nCalculator", font=serif, fill=TEXT, spacing=10)
    d.multiline_text((80, 410), "La phase de la Lune,\npour n'importe quelle date.", font=sans, fill=TEXT_2, spacing=10)
    og.convert("RGB").save(ASSETS / "og-image.jpg", quality=84, optimize=True, progressive=True)

    for p in sorted(ASSETS.iterdir()):
        print(f"{p.name:24} {p.stat().st_size / 1024:7.1f} Ko")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
