---
name: idee
description: Werk een idee van Mels uit tot taakpakketten en verdeel die over Codex, Copilot en Hermes. Gebruik dit als Mels een idee, functie of wens voor de app geeft ("ik wil dat...", "kun je ... toevoegen", "/idee ...") en dat gebouwd moet worden met de agents.
argument-hint: "<het idee in je eigen woorden>"
---

# Van idee naar taakpakketten

Mels stuurt Claude aan met ideeën. Claude werkt een idee uit tot een plan, knipt het in kleine taakpakketten, verdeelt die over de uitvoerders, laat ze bouwen en controleert alles. Mels beslist; Claude zet niets klaar zonder akkoord op het plan.

Verder gelden `CLAUDE.md`, `AGENTS.md`, `hermes/WERKWIJZE.md` en `werkpakketten/00-werkwijze.md`.

## 1. Begrijpen
1. Lees het idee en de delen van de code die het raakt. Lees niet het hele project.
2. Ontbreekt er iets wat alleen Mels kan beslissen (wat de gebruiker ziet, wat er gebeurt bij een fout, wat er buiten valt)? Stel die vragen **in één keer**, kort, met jouw voorstel erbij. Wat je zelf kunt beslissen, beslis je en schrijf je op.

## 2. Plan schrijven
Schrijf `werkpakketten/plannen/<jjjj-mm-dd>-<korte-naam>.md` met:
- **Idee:** in twee of drie zinnen, in je eigen woorden.
- **Keuzes:** wat je hebt besloten en waarom, en wat er buiten valt.
- **Pakketten:** een tabel met per pakket: nummer, titel, bestanden, uitvoerder, hangt af van, golf.
- **Tests:** welke tests er komen en in welk pakket. Tests gaan voor de code.
- **Open vragen** voor Mels, als die er nog zijn.

Toon het plan kort aan Mels (de tabel en de keuzes) en wacht op akkoord. Past Mels iets aan, werk dan het plan bij.

## 3. Verdelen
Elk pakket is klein: één doel, de exacte bestanden, controleerbare criteria, liefst minder dan 300 regels, de test meegeteld. Wie wat krijgt:

| Uitvoerder | Krijgt | Label |
|---|---|---|
| Codex | logica, data, taken met meerdere bestanden, tests | `agent-codex` |
| Copilot | interface en opmaak, kleinere codetaken | `agent-copilot` |
| Hermes | kleine achtergrondtaken: teksten, documentatie, configuratie, mechanische wijzigingen, altijd met `--verwacht` | `agent-hermes` |
| Claude zelf | opzet en architectuur, lastige stukken, alles wat niet in een kleine taak past | geen issue |

- Verdeel het werk over Codex en Copilot, zodat ze tegelijk werken en hun limieten gespreid worden. Raakt de limiet van een van beide op, dan neemt de ander het vanzelf over.
- Pakketten die dezelfde bestanden raken, komen in verschillende golven. Het script laat ze ook zelf op elkaar wachten.
- Schrijf precieze tekst en code in de taak wanneer dat kan, met `--verwacht`. Dat maakt het resultaat betrouwbaarder, en zulke PR's merget het script zelf, zodat Claude ze niet hoeft na te kijken.

## 4. Klaarzetten en starten
1. Schrijf eerst de tests van de golf (zelf, of als pakket voor Codex met de exacte testcode).
2. Maak per pakket een issue:
   ```bash
   bash hermes/maak-taak.sh --voor codex --titel "..." --doel "..." --bestand pad --stap "..." [--verwacht "..."] --bron "werkpakketten/plannen/<plan>.md"
   ```
3. Zet de issuenummers in de tabel van het plan.
4. Start op de achtergrond, vanuit `C:\SCORE2SOUND`:
   ```bash
   bash hermes/werkpakketten.sh --alle
   ```
   Elke uitvoerder werkt dan zijn eigen wachtrij af, in een eigen kloon. Werk intussen zelf aan wat voor jou is.

## 5. Controleren en afronden
1. Het script filtert de fouten eruit en merget zelf wat precies volgens de taak is. Draai `bash hermes/review.sh` en doe alleen wat daar staat. Doe de controles van het script niet opnieuw.
2. Merge, of keur af met korte punten per bestand en `agent-terug` (start daarna `werkpakketten.sh --alle` opnieuw). Een taak met `agent-vast`: maak hem kleiner of preciezer, of doe hem zelf.
3. Is een golf gemerged, zet dan de volgende klaar.
4. Is het plan af: draai `bash hermes/tests.sh` op `main`, werk het plan bij (wat gedaan is, door wie, wat open is) en meld het kort aan Mels. Ideeën voor later gaan naar `werkpakketten/voorraad.md`.
