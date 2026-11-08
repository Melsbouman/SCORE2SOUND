# Licenties: besluit en regels (8 nov 2026)

## Besluit
- **Eigen code van SCORE2SOUND: alle rechten voorbehouden** (zie `LICENSE.md`). Het repo is openbaar ter inzage, maar niemand mag de code gebruiken, kopiëren of als dienst aanbieden zonder toestemming. Zo kan geen ander de app als concurrent hosten.
- **Scanmotoren onder AGPL-3.0 (Audiveris, homr): accepteren**, op voorwaarde dat ze losse programma's blijven. Dan geldt de AGPL alleen voor die programma's, niet voor de rest van de app.

## Regels (voor Claude en alle uitvoerders)
1. Audiveris, homr en andere AGPL-programma's worden alleen als **los programma** aangeroepen (opdrachtregel, bestanden, een aparte container). Nooit hun code kopiëren, overschrijven of als bibliotheek in de app inbouwen.
2. Passen we zo'n programma zelf aan, dan komt die aangepaste versie openbaar in een eigen repo, onder AGPL-3.0.
3. Een publieke versie van de app krijgt een pagina **Licenties en broncode** met de onderdelen hieronder, hun licentie en een link naar hun broncode (en naar onze aanpassingen, als die er zijn). De scancontainer levert de licentieteksten mee.
4. Verovio (LGPL) blijft een apart geladen bestand, zodat het te vervangen is; de licentietekst gaat mee.

## Onderdelen
| Onderdeel | Licentie | Hoe gebruikt |
|---|---|---|
| Audiveris 5.11 | AGPL-3.0 | los programma op de server (scannen) |
| homr | AGPL-3.0 | los programma (scannen, vergelijking) |
| verovio 6.3.0 | LGPL-3.0-or-later | bibliotheek in de browser (notenschrift tekenen) |
| fast-xml-parser 5.11.2 | MIT | bibliotheek (MusicXML lezen) |
| spessasynth_lib 4.4.1 | Apache-2.0 | bibliotheek in de browser (afspelen) |
| klankbank `standaard.sf3` (MuseScore General) | MIT | geluidsbestand, niet in git |

## Wat het betekent
**Voor Mels**
- Betaald aanbieden mag; de AGPL verbiedt verkopen niet.
- De eigen code blijft van hem. Plichten: de regels hierboven, en bij een aanpassing van een scanmotor die aanpassing openbaar maken.
- Laat dit nakijken (bijvoorbeeld bij het juridisch loket van Avans) voordat er voor het eerst betaald wordt.

**Voor klanten**
- Hun eigen stukken en projecten blijven privé: de AGPL gaat over programmacode, niet over hun bladmuziek.
- Ze kunnen in de app zien welke open onderdelen er gebruikt worden en waar de broncode staat.
- Ze krijgen geen recht op de code van SCORE2SOUND zelf; verder merken ze er niets van en het kost hun niets extra.
