"""Maakt de sjablonen voor de herkenning uit het muzieklettertype Bravura (SIL Open Font License, staat al in de app).

Elk teken wordt getekend op een vaste lijnafstand (REFERENTIE pixels) en als zwart-wit opgeslagen in
app/src/herkenning/sjablonen.json, met het ankerpunt van het teken: in SMuFL ligt de oorsprong links op de basislijn; bij een
nootkop, rust, voorteken of punt is dat de plek op de notenbalk (lijn of tussenruimte) waar het teken bij hoort, bij een
sleutel de lijn waar hij op staat.

Gebruik (alleen nodig als de lijst tekens verandert): python -I automatisering/maak-sjablonen.py
Nodig: Python met Pillow. De app zelf gebruikt alleen het JSON-bestand.
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HIER = os.path.dirname(os.path.abspath(__file__))
LETTERTYPE = os.path.join(HIER, '..', 'app', 'public', 'fonts', 'Bravura.woff2')
UIT = os.path.join(HIER, '..', 'app', 'src', 'herkenning', 'sjablonen.json')
REFERENTIE = 24  # pixels per lijnafstand; in SMuFL is de em vier lijnafstanden

TEKENS = {
    'kop-zwart': 0xE0A4, 'kop-half': 0xE0A3, 'kop-heel': 0xE0A2,
    'rust-heel': 0xE4E3, 'rust-half': 0xE4E4, 'rust-kwart': 0xE4E5, 'rust-8': 0xE4E6, 'rust-16': 0xE4E7, 'rust-32': 0xE4E8,
    'mol': 0xE260, 'herstel': 0xE261, 'kruis': 0xE262,
    'sleutel-g': 0xE050, 'sleutel-f': 0xE062, 'sleutel-c': 0xE05C,
    'punt': 0xE1E7, 'vlag-8-op': 0xE240, 'vlag-8-neer': 0xE241, 'vlag-16-op': 0xE242, 'vlag-16-neer': 0xE243,
    'maat-c': 0xE08A, 'maat-alla-breve': 0xE08B,
    **{f'cijfer-{n}': 0xE080 + n for n in range(10)},
}


def maak():
    lettertype = ImageFont.truetype(LETTERTYPE, REFERENTIE * 4)
    sjablonen = {}
    for naam, code in TEKENS.items():
        teken = chr(code)
        links, boven, rechts, onder = lettertype.getbbox(teken, anchor='ls')
        breedte = rechts - links
        hoogte = onder - boven
        beeld = Image.new('L', (breedte + 4, hoogte + 4), 0)
        ImageDraw.Draw(beeld).text((2 - links, 2 - boven), teken, font=lettertype, fill=255, anchor='ls')
        # Bijsnijden tot de zwarte pixels, en het anker (oorsprong op de basislijn) mee laten schuiven.
        kader = beeld.point(lambda waarde: 255 if waarde >= 128 else 0).getbbox()
        if not kader:
            continue
        x0, y0, x1, y1 = kader
        uitsnede = beeld.crop(kader)
        rijen = [''.join('#' if uitsnede.getpixel((x, y)) >= 128 else '.' for x in range(uitsnede.width)) for y in range(uitsnede.height)]
        sjablonen[naam] = {
            'code': f'U+{code:04X}',
            'ankerX': (2 - links) - x0,
            'ankerY': (2 - boven) - y0,
            'rijen': rijen,
        }
    with open(UIT, 'w', encoding='utf-8', newline='\n') as bestand:
        json.dump({'lettertype': 'Bravura (SIL OFL 1.1)', 'lijnafstand': REFERENTIE, 'sjablonen': sjablonen}, bestand, indent=1)
        bestand.write('\n')
    print(f'{len(sjablonen)} sjablonen in {UIT}')


if __name__ == '__main__':
    sys.exit(maak())
