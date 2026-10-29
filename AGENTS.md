# Afspraken voor agents (Codex, Copilot, Hermes en andere uitvoerders)

Je voert één taak uit, meestal een GitHub-issue. Claude maakt de plannen en controleert je PR. Jij bouwt alleen wat in de taak staat. Hoe een taak van idee tot merge loopt, staat in `hermes/WERKWIJZE.md`.

## Hoe je draait
- **Via het runner-script** (`hermes/werkpakket.sh`, de gewone route): jij bewerkt alleen de bestanden uit het issue. Draai zelf geen tests, geen git-commando's en geen andere commando's, en open geen PR: het script controleert, commit, pusht, opent de PR en zet de labels. Laat het regeleinde aan het einde van elk bestand staan en verander verder niets.
- **Handmatig** (zonder script): lees ook "Voor je begint" en "Voor je de PR opent" hieronder.

## Voor je begint (handmatig)
1. Lees `werkpakketten/00-werkwijze.md`. De harde regels daar gelden altijd.
2. Lees de taak helemaal, inclusief de acceptatiecriteria.
3. Klopt de taak niet met de code, of ontbreekt er iets? Stop en meld het. Gok niet.

## Werkwijze
- Werk op een eigen branch: `agent/<nummer>-<korte-naam>`. Nooit direct op `main`.
- Raak alleen de bestanden aan die in de taak staan. Andere agents kunnen tegelijk aan andere bestanden werken.
- Geen nieuwe dependencies, tenzij de taak ze precies noemt.
- Geen sleutels, tokens, wachtwoorden of `.env`-bestanden in de repo.
- Pas geen bestaande tests aan en verwijder ze niet, tenzij de taak dat vraagt. Een test die faalt los je op in de code, niet in de test.
- Verwijder geen bestanden, tenzij de taak dat zegt.
- Volg de stijl en de taal van de code eromheen. Nieuwe teksten en commentaar in het Nederlands, tenzij de taak iets anders zegt.
- Een taak met een blok `## Verwacht` wil precies die regels toegevoegd hebben, met de inspringing van de omliggende regels, en niets verwijderd.

## Project
SCORE2SOUND is een web-app die bladmuziek omzet naar bewerkbare, hoorbare muziek. Het plan staat in `werkpakketten/plannen/2026-10-29-score2sound-app.md`.
- Alles staat in `app/`: Node 24, JavaScript-modules (`.mjs` op de server, `.js` in de browser), geen framework en geen bouwstap.
- `app/src/` bevat de logica: `model/` (rekenwerk), `musicxml/`, `controle/`, `midi/`, `project/`, en `server/` (API-afhandeling). Alles behalve `server/`, `musicxml/xml.mjs` en `musicxml/lezen.mjs` draait ook in de browser: gebruik daar geen Node-modules zoals `node:fs`.
- `app/public/` is de browserkant: `index.html`, `app.css`, `js/main.js` start elk scherm, `js/app.js` is de gedeelde stand. Elk scherm exporteert `start(app)` en tekent alleen in zijn eigen `<section id="...">`.
- MusicXML lees je met de hulp in `app/src/musicxml/xml.mjs` (`leesXml`, `kind`, `kinderen`, `tekst`, `getal`), niet rechtstreeks met fast-xml-parser.
- **Het muziekmodel in `docs/model.md` is het contract.** Tijd in tikken (480 per kwartnoot), genoteerde toonhoogte, meldingen in vaste vorm. Wijk er niet van af.
- Tests in `app/test/*.test.mjs` met `node:test` en `node:assert/strict`; testvoorbeelden in `app/test/voorbeelden/`. Staat een test in je taak, neem hem dan letterlijk over.
- Bibliotheken: alleen `verovio`, `fast-xml-parser` en `spessasynth_lib`. Geen andere.
- Teksten in de app in het Nederlands, rustig en concreet, met "je". Muziektermen zoals een Nederlandse muzikant ze kent (maat, maatsoort, voortekens, partij, stemming).

## Voor je de PR opent (handmatig)
```bash
# vanuit de hoofdmap van de repo:
bash hermes/tests.sh pad1 pad2
node hermes/regels-controle.mjs --basis main --toegestaan "pad1,pad2"
```
Zet de letterlijke uitkomst in de PR-beschrijving, met `Hoort bij #<nummer>`, en daarnaast:
- per gewijzigd bestand één zin wat er veranderde;
- wat je niet gedaan hebt of waar je twijfelt.

Open daarna een PR naar `main` en laat de merge aan Claude of Mels.

## Labels
De labels op een issue geven de stand aan:
- `agent-ready`: klaar om op te pakken;
- `agent-bezig`: een agent werkt eraan (maximaal één per uitvoerder tegelijk);
- `agent-review`: PR is open, Claude controleert;
- `agent-terug`: Claude heeft de PR afgekeurd, de agent past hem aan;
- `agent-vast`: de agent kon niet verder, de reden staat als comment op het issue;
- `agent-codex`, `agent-copilot`, `agent-hermes`: wie de taak bouwt;
- `agent-exact` (op de PR): de wijziging komt precies overeen met `## Verwacht`.

Merge nooit zelf en push nooit naar `main`.
