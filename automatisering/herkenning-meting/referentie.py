"""Haalt de noten per maat uit een MusicXML-bestand (.mxl) als JSON, als referentie voor de metingen van de eigen herkenning.

Gebruik: python -I automatisering/herkenning-meting/referentie.py <stuk.mxl> <uit.json>
Per maat: nummer, noten (rust, of stam, alter, octaaf, voorteken, akkoord, voorslag; duur in tikken, en `groep` als de noot in
een triool staat) en de eigenschappen (voortekening, maatsoort, sleutel, meermaatsrust).
"""
import json
import sys
import xml.etree.ElementTree as ET
import zipfile


def lees(mxl, uit):
    archief = zipfile.ZipFile(mxl)
    naam = [n for n in archief.namelist() if n.endswith('.xml') and not n.startswith('META')][0]
    partij = ET.fromstring(archief.read(naam)).find('part')
    maten = []
    delen = 1
    for maat in partij.findall('measure'):
        gegevens = {'nummer': maat.get('number'), 'noten': [], 'attr': {}}
        for deel in maat:
            if deel.tag == 'attributes':
                if deel.findtext('divisions'):
                    delen = float(deel.findtext('divisions'))
                kwint = deel.find('key/fifths')
                tijd = deel.find('time')
                sleutel = deel.find('clef')
                rust = deel.find('measure-style/multiple-rest')
                if kwint is not None:
                    gegevens['attr']['fifths'] = int(kwint.text)
                if tijd is not None:
                    gegevens['attr']['time'] = (tijd.findtext('beats'), tijd.findtext('beat-type'), tijd.get('symbol'))
                if sleutel is not None:
                    gegevens['attr']['clef'] = (sleutel.findtext('sign'), sleutel.findtext('line'))
                if rust is not None:
                    gegevens['attr']['multi'] = int(rust.text)
            if deel.tag == 'note':
                # Duur in tikken (480 per kwartnoot), en of de noot in een triool of andere groep staat.
                duur = round(float(deel.findtext('duration') or 0) * 480 / delen)
                groep = deel.find('time-modification') is not None
                if deel.find('rest') is not None:
                    gegevens['noten'].append({'rust': True, 'duur': duur, 'heleMaat': deel.find('rest').get('measure') == 'yes', 'groep': groep})
                    continue
                toon = deel.find('pitch')
                teken = deel.find('accidental')
                gegevens['noten'].append({
                    'step': toon.findtext('step'), 'alter': int(float(toon.findtext('alter') or 0)), 'oct': int(toon.findtext('octave')),
                    'acc': teken.text if teken is not None else None,
                    'chord': deel.find('chord') is not None, 'grace': deel.find('grace') is not None,
                    'duur': duur, 'groep': groep,
                })
        maten.append(gegevens)
    with open(uit, 'w', encoding='utf-8') as bestand:
        json.dump(maten, bestand, indent=0)
    print(f'{len(maten)} maten in {uit}')


if __name__ == '__main__':
    lees(sys.argv[1], sys.argv[2])
