"""Tekent de bladzijden van een pdf als grijsbeeld (PGM en PNG, 200 dpi) voor de metingen van de eigen herkenning.

Gebruik: python -I automatisering/herkenning-meting/teken.py <pdf> <uit-voorvoegsel> [aantal bladzijden]
Maakt <uit-voorvoegsel>1.pgm, <uit-voorvoegsel>1.png, ... (bijvoorbeeld uit-voorvoegsel C:/tmp/galop/p geeft p1.pgm).
Nodig: PyMuPDF (alleen voor het meten, niet voor de app).
"""
import sys

import pymupdf


def teken(pdf, uit, aantal=None):
    document = pymupdf.open(pdf)
    for nummer, bladzijde in enumerate(document, start=1):
        if aantal and nummer > aantal:
            break
        beeld = bladzijde.get_pixmap(dpi=200, colorspace=pymupdf.csGRAY)
        beeld.save(f'{uit}{nummer}.pgm')
        beeld.save(f'{uit}{nummer}.png')
        print(f'{uit}{nummer}.pgm {beeld.width}x{beeld.height}')


if __name__ == '__main__':
    teken(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else None)
