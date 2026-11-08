"""Maakt van een schone pdf een "gescande" variant voor de scanmeting: lagere resolutie, licht scheef, ruis en minder contrast.

Gebruik:
  python -I automatisering/vervuil.py <invoer.pdf> <uit.pdf> [--dpi 200] [--hoek 1.2] [--ruis 18] [--contrast 0.8] [--zaad 1]

Elke pagina wordt een afbeelding (zoals een scanner die maakt) en weer een pdf. Met hetzelfde zaad komt er steeds hetzelfde uit,
zodat metingen vergelijkbaar blijven. Vraagt pymupdf en Pillow (alleen voor de meting, niet voor de app).
"""
import argparse
import io
import random

import pymupdf
from PIL import Image, ImageEnhance, ImageFilter


def vervuil_pagina(beeld, hoek, ruis, contrast, kans):
    grijs = beeld.convert("L")
    grijs = ImageEnhance.Contrast(grijs).enhance(contrast)
    grijs = grijs.filter(ImageFilter.GaussianBlur(radius=0.6))
    grijs = grijs.rotate(hoek, resample=Image.BICUBIC, expand=False, fillcolor=255)
    pixels = grijs.load()
    breedte, hoogte = grijs.size
    for y in range(hoogte):
        for x in range(breedte):
            waarde = pixels[x, y] + kans.randint(-ruis, ruis)
            if kans.random() < 0.0008:
                waarde = 0 if waarde > 128 else 255
            pixels[x, y] = max(0, min(255, waarde))
    return grijs


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("invoer")
    ap.add_argument("uit")
    ap.add_argument("--dpi", type=int, default=200)
    ap.add_argument("--hoek", type=float, default=1.2)
    ap.add_argument("--ruis", type=int, default=18)
    ap.add_argument("--contrast", type=float, default=0.8)
    ap.add_argument("--zaad", type=int, default=1)
    a = ap.parse_args()
    kans = random.Random(a.zaad)
    bron = pymupdf.open(a.invoer)
    doel = pymupdf.open()
    for nummer, pagina in enumerate(bron):
        pix = pagina.get_pixmap(dpi=a.dpi)
        beeld = Image.open(io.BytesIO(pix.tobytes("png")))
        hoek = a.hoek if nummer % 2 == 0 else -a.hoek
        vuil = vervuil_pagina(beeld, hoek, a.ruis, a.contrast, kans)
        buffer = io.BytesIO()
        vuil.save(buffer, format="PNG")
        nieuw = doel.new_page(width=pagina.rect.width, height=pagina.rect.height)
        nieuw.insert_image(nieuw.rect, stream=buffer.getvalue())
    doel.save(a.uit, deflate=True)
    print(f"{len(bron)} pagina's vervuild: {a.uit}")


if __name__ == "__main__":
    main()
