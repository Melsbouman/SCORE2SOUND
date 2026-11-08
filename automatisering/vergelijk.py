"""Zet de pagina's van het origineel en van de herkende pdf naast elkaar in een png (pymupdf).
Gebruik: python automatisering/vergelijk.py <origineel.pdf> <herkend.pdf> <uit.png> [pagina]"""
import sys
import pymupdf

origineel, herkend, uit = sys.argv[1:4]
pagina = int(sys.argv[4]) - 1 if len(sys.argv) > 4 else 0
a = pymupdf.open(origineel)[pagina].get_pixmap(dpi=70)
b = pymupdf.open(herkend)[0].get_pixmap(dpi=70)
hoogte = max(a.height, b.height)
doel = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, a.width + b.width + 10, hoogte), 0)
doel.set_rect(doel.irect, (255, 255, 255))
doel.copy(a, pymupdf.IRect(0, 0, a.width, a.height)) if False else None
a.set_origin(0, 0)
b.set_origin(a.width + 10, 0)
doel.copy(a, a.irect)
doel.copy(b, b.irect)
doel.save(uit)
