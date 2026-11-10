"""Ontcijfert een JPEG of PNG naar een grijze PGM, verkleind zoals de browser doet (hooguit 2600 pixels breed en 16 miljoen pixels).
Gebruik: python -I automatisering/herkenning-meting/jpeg-grijs.py <beeld> <uit.pgm>
Hulp voor browserbladen.mjs. Vraagt Pillow (alleen voor het meten, niet voor de app).
"""

import sys

from PIL import Image

beeld = Image.open(sys.argv[1]).convert('L')
factor = max(1, beeld.width / 2600, ((beeld.width * beeld.height) / 16e6) ** 0.5)
if factor > 1:
    beeld = beeld.resize((int(beeld.width // factor), int(beeld.height // factor)), Image.LANCZOS)
beeld.save(sys.argv[2])
