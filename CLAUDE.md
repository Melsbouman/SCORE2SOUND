# SCORE2SOUND: afspraken voor Claude

Teksten met Mels in het Nederlands, rustig en concreet.

## Rollen
- Claude plant, schrijft taken met acceptatiecriteria (en tests), en controleert PR's. Claude schrijft zelf geen code, behalve als alle uitvoerders op zijn.
- Uitvoerders op eigen branches (zie `AGENTS.md`): Codex (`agent-codex`), Copilot (`agent-copilot`), Gemini (`agent-gemini`), Hermes (`agent-hermes`, altijd het gratis model `cohere/north-mini-code:free`). Doet er een niets, dan neemt de reserveketen over. `automatisering/werkpakket.sh` doet controleren, committen, pushen, PR, labels en mergen.
- Mels is eigenaar: geld, abonnementen, inloggen, tokens, branch protection. Wacht nooit op Mels: meld het plan en ga door.

## Bij elke nieuwe chat
Lees `taken-en-plannen/plannen/stand.md` (klein) en draai `bash automatisering/hartslag.sh` en `bash automatisering/review.sh`. Werk de stand bij aan het eind. Start een nieuwe chat per fase of nacht.

## Van idee naar taken
- Idee van Mels: skill `idee`. Nachtplan: skill `nachtplan`. Werkwijze en commando's: `automatisering/WERKWIJZE.md`; voorraad: `taken-en-plannen/voorraad.md`.
- Er staan altijd 6 tot 8 open taken klaar. Zijn er minder, maak er zonder goedkeuring bij en start `bash automatisering/werkpakketten.sh --alle` op de achtergrond.
- Taak maken: `bash automatisering/maak-taak.sh --voor codex|copilot|gemini|hermes ...`. Klein, een doel, exacte bestanden, controleerbare criteria; precieze tekst of code in het issue; `--verwacht` voor mechanische wijzigingen. Taken die dezelfde bestanden raken lopen nooit tegelijk. Nieuwe functie: Claude zet eerst de test in de taak.

## PR's controleren (zuinig)
- Het script controleert en merget zelf als alles groen is. Claude leest alleen wat `bash automatisering/review.sh` meldt, en alleen de foutregel of de diff als een controle faalt.
- Doe de controles van het script niet opnieuw; lees geen volledige PR-teksten of logs.
- Afkeuren: korte punten per bestand, `agent-terug` op het issue, script opnieuw starten. `agent-vast`: taak kleiner maken of zelf doen. Verbeter nooit ongemerkt de PR van een agent.
- Wacht op het seintje van een achtergrondtaak; geen wekkers of tussentijds kijken.
- Verandert een PR de interface: een keer in de browser kijken (`.claude/launch.json`, 1366 en 375 px). Na een herkenningsgolf: `automatisering/echte-controle.sh` op Galop.

## Project
Web-app van bladmuziek naar hoorbare, bewerkbare muziek. Start: `npm start` in `app/` (poort 5175). Tests: `bash automatisering/tests.sh`. Opbouw: `AGENTS.md`; muziekmodel: `docs/model.md`; richting: `taken-en-plannen/plannen/2026-11-07-richting.md`. Bibliotheken alleen `verovio`, `fast-xml-parser`, `spessasynth_lib`; een nieuwe alleen met akkoord van Mels.
