"""Maakt app/public/ontdekken/catalogus.json uit de bestandslijsten van gratis bronnen op GitHub.

Gebruik (vanuit de repo): python -I werkpakketten/bronnen/maak_catalogus.py
Bronnen (alleen MusicXML-bestanden; rechtenvrij of CC0):
- OpenScore Lieder (CC0): liederen
- OpenScore StringQuartets (CC0): strijkkwartetten
- music21 corpus (publiek domein): koralen van Bach, Beethoven, Mozart, Haydn, ragtime en meer
"""
import json
import re
import sys
import urllib.request

UIT = 'app/public/ontdekken/catalogus.json'

BRONNEN = [
    {'repo': 'OpenScore/Lieder', 'tak': 'main', 'naam': 'OpenScore Lieder (CC0)', 'categorie': 'Liederen', 'map': 'scores/', 'diepte': 'openscore'},
    {'repo': 'OpenScore/StringQuartets', 'tak': 'main', 'naam': 'OpenScore String Quartets (CC0)', 'categorie': 'Strijkkwartetten', 'map': 'scores/', 'diepte': 'openscore'},
    {'repo': 'cuthbertLab/music21', 'tak': 'master', 'naam': 'music21 corpus (publiek domein)', 'categorie': None, 'map': 'music21/corpus/', 'diepte': 'music21'},
]

M21_COMPONISTEN = {
    'bach': ('Johann Sebastian Bach', 'Bach-koralen'),
    'beethoven': ('Ludwig van Beethoven', 'Klassiek en barok'),
    'mozart': ('Wolfgang Amadeus Mozart', 'Klassiek en barok'),
    'haydn': ('Joseph Haydn', 'Klassiek en barok'),
    'handel': ('Georg Friedrich Händel', 'Klassiek en barok'),
    'corelli': ('Arcangelo Corelli', 'Klassiek en barok'),
    'cpebach': ('Carl Philipp Emanuel Bach', 'Klassiek en barok'),
    'weber': ('Carl Maria von Weber', 'Klassiek en barok'),
    'schumann_robert': ('Robert Schumann', 'Klassiek en barok'),
    'schumann_clara': ('Clara Schumann', 'Klassiek en barok'),
    'schubert': ('Franz Schubert', 'Klassiek en barok'),
    'verdi': ('Giuseppe Verdi', 'Klassiek en barok'),
    'schoenberg': ('Arnold Schönberg', 'Klassiek en barok'),
    'webern': ('Anton Webern', 'Klassiek en barok'),
    'joplin': ('Scott Joplin', 'Ragtime en meer'),
    'liliuokalani': ('Liliʻuokalani', 'Ragtime en meer'),
    'johnson_j_r': ('J. Rosamond Johnson', 'Ragtime en meer'),
    'beach': ('Amy Beach', 'Ragtime en meer'),
    'monteverdi': ('Claudio Monteverdi', 'Oude muziek'),
    'trecento': ('Trecento', 'Oude muziek'),
    'ciconia': ('Johannes Ciconia', 'Oude muziek'),
    'luca': ('Luca Marenzio', 'Oude muziek'),
    'lusitano': ('Vicente Lusitano', 'Oude muziek'),
}


def haal(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


def netjes(s):
    return s.replace('_', ' ').strip()


def naam_omdraaien(c):
    c = netjes(c)
    if ',' in c:
        a, b = c.split(',', 1)
        c = (b.strip() + ' ' + a.strip()).strip()
    return c


def titel_music21(delen, bestand):
    naam = re.sub(r'\.(mxl|xml|musicxml)$', '', bestand)
    uit = []
    for d in delen + [naam]:
        d = re.sub(r'^bwv(.+)$', lambda m: 'Koraal BWV ' + m.group(1), d)
        d = re.sub(r'^opus(\d+)no(\d+)$', lambda m: f'Opus {m.group(1)} nr. {m.group(2)}', d)
        d = re.sub(r'^opus(\d+)$', lambda m: f'Opus {m.group(1)}', d)
        d = re.sub(r'^k(\d+)$', lambda m: f'K. {m.group(1)}', d)
        d = re.sub(r'^movement(\d+)$', lambda m: f'deel {m.group(1)}', d)
        uit.append(netjes(d))
    return ', '.join(uit)


def main():
    werken = []
    for bron in BRONNEN:
        boom = haal(f"https://api.github.com/repos/{bron['repo']}/git/trees/{bron['tak']}?recursive=1")
        for x in boom['tree']:
            p = x['path']
            if x['type'] != 'blob' or not p.startswith(bron['map']):
                continue
            if bron['diepte'] == 'openscore':
                if not p.endswith('.mxl'):
                    continue
                delen = p[len(bron['map']):].split('/')
                if len(delen) < 3:
                    continue
                componist = naam_omdraaien(delen[0])
                werk = netjes(delen[1] if bron['categorie'] == 'Strijkkwartetten' else delen[-2])
                reeks = '' if delen[1] == '_' or bron['categorie'] != 'Liederen' else netjes(delen[1])
                if bron['categorie'] == 'Strijkkwartetten' and len(delen) > 3:
                    werk = netjes(delen[1]) + ', ' + netjes(delen[-2])
                werken.append({'id': delen[-1][:-4], 'titel': werk, 'componist': componist, 'reeks': reeks,
                               'categorie': bron['categorie'], 'repo': bron['repo'], 'tak': bron['tak'], 'pad': p})
            else:
                if not re.search(r'\.(mxl|xml|musicxml)$', p):
                    continue
                delen = p[len(bron['map']):].split('/')
                if delen[0] not in M21_COMPONISTEN:
                    continue
                componist, categorie = M21_COMPONISTEN[delen[0]]
                bestand = delen[-1]
                tussen = delen[1:-1]
                werken.append({'id': 'm21-' + re.sub(r'[^A-Za-z0-9]+', '-', '/'.join(delen[:-1] + [re.sub(r'\.[a-z]+$', '', bestand)])).strip('-'),
                               'titel': titel_music21(tussen, bestand), 'componist': componist, 'reeks': '',
                               'categorie': categorie, 'repo': bron['repo'], 'tak': bron['tak'], 'pad': p})
    werken.sort(key=lambda r: (r['categorie'], r['componist'], r['reeks'], r['titel']))
    gezien = {}
    for w in werken:
        n = gezien.get(w['id'], 0)
        gezien[w['id']] = n + 1
        if n:
            w['id'] = f"{w['id']}-{n + 1}"
    json.dump({'bronnen': [{'naam': b['naam'], 'repo': b['repo']} for b in BRONNEN], 'werken': werken},
              open(UIT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    tel = {}
    for w in werken:
        tel[w['categorie']] = tel.get(w['categorie'], 0) + 1
    print(len(werken), tel)


if __name__ == '__main__':
    sys.exit(main())
