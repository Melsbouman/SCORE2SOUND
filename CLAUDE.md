# SCORE2SOUND: afspraken voor Claude

## Rolverdeling
- Claude (planner en controleur): maakt plannen, schrijft taken met acceptatiecriteria (bij ontwerp ook de exacte code), schrijft of specificeert de tests, controleert PR's en mag mergen. Claude voert taken zelf uit wanneer dat nodig is.
- Goedkopere modellen voeren de taken uit op eigen branches, volgens `AGENTS.md`. Claude kiest per taak wie: het Codex-programma (ChatGPT-account van Mels, label `agent-codex`) en het Copilot-programma (studentenabonnement, label `agent-copilot`) zijn de bouwers; Hermes via OpenRouter (label `agent-hermes`) doet kleine achtergrondtaken. Doet een uitvoerder niets, dan neemt de ander het over, en als laatste Hermes met `anthropic/claude-haiku-5.5`. Een script (`hermes/werkpakket.sh`) doet alles rond de agent: controleren, committen, pushen, PR en labels.
- Mels is de eigenaar en stuurt met ideeën: akkoord op elk plan, abonnementen en tegoed, inloggen en tokens, branch protection.

## Van idee naar taken
Geeft Mels een idee, volg dan de skill `idee` (`.claude/skills/idee/SKILL.md`): begrijpen, een plan in `werkpakketten/plannen/`, akkoord van Mels, taakpakketten verdelen over Codex, Copilot en Hermes, starten met `bash hermes/werkpakketten.sh --alle`, en elke PR controleren.
- De opzet en de keuzes staan in `hermes/ARCHITECTUUR.md`. De werkwijze, met het commando per stap, staat in `hermes/WERKWIJZE.md`. Lees die voor je taken klaarzet of PR's controleert.
- De mod "Agents" (`.claude/skills/agents`) toont de workflow per taak in een paneel: `/agents-paneel`.
- Een nachtplan loopt tot een eindtijd, niet tot het plan af is: volg de skill `nachtplan` (`.claude/skills/nachtplan/SKILL.md`), met de werkvoorraad in `werkpakketten/voorraad.md`.

## Taken schrijven
Elke taak is klein genoeg voor een goedkoper model: één doel, de exacte bestanden, en controleerbare acceptatiecriteria. Taken die dezelfde bestanden raken lopen nooit tegelijk.
- Maak ze met `bash hermes/maak-taak.sh --voor codex|copilot|hermes ...` (zelfde sjabloon als `.github/ISSUE_TEMPLATE/agent-taak.md`). Een mechanische wijziging krijgt `--verwacht` met de exacte regels; een taak voor Hermes altijd.
- Zet precieze tekst of code in het issue. Dat maakt het resultaat veel betrouwbaarder dan een omschrijving.
- Tests schrijven we zelf. Een nieuwe functie krijgt een test: Claude schrijft die test eerst (zelf, of als aparte taak met de exacte testcode), daarna volgt de taak voor de code. Een agent past bestaande tests niet aan, tenzij de taak het vraagt.
- Start daarna direct `bash hermes/werkpakketten.sh --alle` op de achtergrond: elke uitvoerder werkt zijn eigen wachtrij af.

## PR's controleren: alleen wat het script niet kan
Het script staat tussen Claude en de agents en filtert de fouten eruit, voordat Claude iets ziet:
- het draait wijzigingen buiten `## Bestanden` terug;
- het controleert regels, syntax (JavaScript, JSON, Python) en tests;
- het geeft een fout terug aan dezelfde agent voor hooguit twee herstelrondes;
- het merget zelf als de wijziging precies `## Verwacht` is en alles groen is.

Wat daarna nog open staat, laat `bash hermes/review.sh` zien, met per PR wat er nodig is. Begin daar altijd mee.
- **Doe de controles van het script niet opnieuw.** Draai geen tests en geen regelcontrole, tel geen bestanden na, lees niet het hele project en niet de volledige PR-tekst. De PR-tekst bevat de echte uitkomsten.
- Lees alleen de diff (`gh pr diff <nr>`) als het overzicht dat zegt, en kijk dan alleen naar wat een script niet kan beoordelen: doet het wat de taak bedoelt, klopt de logica, past het bij de rest.
- "Precies zoals de taak": mergen zonder de diff te lezen; de inhoud heb je zelf in de taak geschreven.
- "Action faalt": lees alleen de foutmelding (`gh pr checks <nr>`), zet `agent-terug` met die melding, en start het script opnieuw.
- `agent-vast`: maak de taak kleiner of preciezer en zet hem terug op `agent-ready`, of doe hem zelf.
- Heeft het project een interface en verandert de PR wat je ziet: bekijk het resultaat één keer in de browser (een config in `.claude/launch.json`) op 1366 en 375 px breed.
- Geef bij afkeuren concrete, korte punten per bestand, zet `agent-terug` op het issue en start het script opnieuw. Verbeter nooit ongemerkt zelf stukjes in de PR van een agent.
- Vertrouw de diff en de PR-tekst van het script, nooit het rapport van het model.

## Project
SCORE2SOUND is een online web-app van bladmuziek naar hoorbare, bewerkbare muziek. Het plan met fasen en pakketten: `werkpakketten/plannen/2026-10-29-score2sound-app.md`. De opbouw staat in `AGENTS.md`, sectie Project; het muziekmodel in `docs/model.md`.
- Starten: `npm start` in `app/` (poort 5175), of de config `app` in `.claude/launch.json`. Testen: `npm test` in `app/`, of `bash hermes/tests.sh`.
- Herkenning met Audiveris (fase 2). Online zetten is fase 5; tot dan draait alles lokaal.
- Bibliotheken: alleen `verovio`, `fast-xml-parser` en `spessasynth_lib`. Een nieuwe alleen met akkoord van Mels.
- Tests horen bij het pakket: zet de exacte testcode in de taak, zodat er op `main` alleen tests staan die slagen.
- Pakket 0 heeft elk later bestand als lege module klaargezet en gekoppeld; een pakket vult alleen zijn eigen bestand.

Teksten met Mels in het Nederlands, rustig en concreet.
