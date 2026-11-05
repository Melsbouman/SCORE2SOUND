#!/bin/bash
# Controleert een taak voordat een agent eraan begint. Gebruik: bash hermes/taak-check.sh <taakbestand.md>
# Exit 0 = goed (er kunnen waarschuwingen staan), exit 3 = fout: de taak moet eerst beter.
# Vangt: een bestaand testbestand in ## Bestanden, een pad in een map die niet bestaat, en een groot bestaand
# bestand zonder ## Maxregels (waarschuwing; de diffgrens van de runner vangt de rest).
DIR="$(cd "$(dirname "$0")/.." && pwd)"
export PYTHONUTF8=1
python -I -X utf8 - "$1" "$DIR" <<'PY'
import sys, os, re
taak, repo = sys.argv[1], sys.argv[2]
tekst = open(taak, encoding='utf-8').read()
bestanden, sectie = [], None
for r in tekst.splitlines():
    if r.startswith('## '):
        sectie = r.strip(); continue
    if sectie == '## Bestanden' and r.startswith('- `') and r.count('`') >= 2:
        bestanden.append(r.split('`')[1].split(' ')[0])
fouten, waarschuwingen = [], []
mechanisch = '## Verwacht' in tekst
maxregels = '## Maxregels' in tekst
tests_mogen = '[test-aanpassen]' in tekst
for b in bestanden:
    pad = os.path.join(repo, b)
    if not os.path.isdir(os.path.dirname(pad)):
        fouten.append(f"{b}: de map bestaat niet (typefout?)")
        continue
    if not os.path.isfile(pad):
        continue  # nieuw bestand
    if re.search(r'(^|/)test/', b) and not tests_mogen:
        fouten.append(f"{b}: bestaat al en is een test; een agent past bestaande tests niet aan. Zet er een nieuw testbestand voor in de plaats, of zet [test-aanpassen] in de taak")
    regels = sum(1 for _ in open(pad, encoding='utf-8', errors='ignore'))
    if regels > 300 and not mechanisch and not maxregels:
        waarschuwingen.append(f"{b}: {regels} regels; houd de wijziging klein, of splits de taak / geef --maxregels mee")
if '## Controle' not in tekst and not mechanisch:
    waarschuwingen.append("geen ## Controle: alleen de tests beslissen over mergen")
for w in waarschuwingen: print('let op:', w)
for f in fouten: print('FOUT:', f)
sys.exit(3 if fouten else 0)
PY
