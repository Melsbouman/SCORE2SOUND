# Plan: de SCORE2SOUND-app

Stand: fase 1 af in de nacht van 29 op 30 oktober 2026 (akkoord van Mels op 29 oktober). Alle pakketten 0 tot en met 19 gemerged; zie het nachtrapport in `werkpakketten/nacht/`. Volgende: fase 3 (partijen en transponeren) kan zonder Audiveris; fase 2 wacht op de installatie van Audiveris.

## Idee
SCORE2SOUND maakt van bladmuziek (PDF, scan of foto) digitale muziek waarmee je verder kunt: bekijken naast het origineel, corrigeren waar de herkenning twijfelt, afspelen per partij met tempo, herhalen en een mixer, partijen eruit halen of samenvoegen, transponeren naar een ander instrument, fouten laten signaleren, en bewaren en exporteren als MusicXML, MIDI, PDF of audio. Voor muzikanten, docenten, dirigenten en ensembles.

## Keuzes
Besloten met Mels:
- **Online web-app.** We bouwen en testen eerst op de eigen computer; online zetten (hosting, accounts, opslag per gebruiker) is een eigen fase aan het eind, als er iets is om te delen.
- **Herkenning met Audiveris** (gratis, open source, levert MusicXML). Hij draait op de server; de app roept hem aan.
- **Een vaste kleine set bibliotheken**, verder alles zelf met tests. Nieuwe bibliotheken alleen met akkoord van Mels.

Besloten door Claude:
- **Volgorde:** eerst het fundament met MusicXML als invoer (inlezen, bekijken, afspelen, controleren, bewaren, exporteren). Daarna is herkenning alleen een nieuwe manier om aan MusicXML te komen. Zo werkt er snel iets, en is alles wat na de herkenning komt al getest.
- **Techniek:** Node 24 met JavaScript-modules, zonder framework en zonder bouwstap. De server gebruikt de ingebouwde `http`-module. Tests met `node --test` (`npm test` in `app/`, dus `hermes/tests.sh` vindt ze vanzelf).
- **Bibliotheken** (vast, met versie in `package.json`):
  - `verovio` 6.3 (LGPL-3.0): notatie tekenen als SVG in de browser, en later PDF;
  - `fast-xml-parser` 5.11 (MIT): MusicXML inlezen, ook in de tests;
  - `spessasynth_lib` 4.4 (Apache-2.0): MIDI afspelen in de browser met een klankbank, met volume en dempen per kanaal;
  - een vrije General MIDI-klankbank (SF2) met een licentie die verspreiden toestaat; welke precies, kiest Claude in pakket 0.
- **Eigen muziekmodel.** Alle onderdelen werken op één JSON-model (`docs/model.md`): partituur, partijen, maten, noten en rusten, met per element een `zekerheid` (0 tot 1) voor wat de herkenning gaf. MusicXML is in- en uitvoer, niet het werkmodel. Zo zijn controleren, transponeren en samenvoegen gewone functies die je kunt testen.
- **Eigen MIDI-schrijver** in plaats van die van Verovio: klein, goed te testen, en hij kent ons model (volume per partij, tempo, herhalingen).
- **Taal:** de app in het Nederlands, met muziektermen zoals een Nederlandse muzikant ze kent (maat, maatsoort, voortekens, partij, stemming). De instrumentenlijst begint bij fanfare en brassband (zoals althoorn en bugel) plus de gangbare orkestinstrumenten.
- **Mappen:**
  ```
  app/
    package.json, server.mjs
    src/model/       muziekmodel en rekenwerk (toonhoogte, duur), gedeeld door server en browser
    src/musicxml/    lezen en schrijven
    src/controle/    maatduur, partijen vergelijken
    src/midi/        MIDI schrijven
    src/project/     projecten bewaren
    public/          index.html, app.css, js/ (main, weergave, speler, views)
    test/            *.test.mjs en test/voorbeelden/*.musicxml
  docs/model.md      het muziekmodel, het contract tussen alle onderdelen
  ```

Valt buiten dit plan (naar de voorraad als het later moet): een volledige notatie-editor (we corrigeren noten, we zetten geen partituur vanaf nul), samenwerken met meerdere mensen tegelijk, een mobiele app.

## Fasen
1. **Fundament:** MusicXML inlezen, bekijken, afspelen per partij met tempo, herhalen en mixer, maatduur controleren, bewaren, MusicXML en MIDI exporteren. Uitgewerkt in pakketten hieronder.
2. **Herkenning:** PDF, scan en foto via Audiveris naar het model; het origineel naast de digitale versie; onzekere noten zichtbaar; noten corrigeren en opnieuw beluisteren.
3. **Partijen en transponeren:** een partij uit de partituur halen, partijen uit bestanden samenvoegen met maatcontrole en meldingen, transponeren met instrumentstemming, sleutel en bereikmeldingen, versies naast elkaar vergelijken en beluisteren.
4. **Meer muzikaal afspelen en exporteren:** de speler volgt tempowissels, dynamiek, articulatie, legato en herhalingen; export als PDF en audio.
5. **Online:** hosting (een container met Node en Audiveris), accounts, opslag per gebruiker, privacy van geüploade partituren.

Fase 2 tot en met 5 knip ik in pakketten als de fase ervoor gemerged is; dan weet ik welke bestanden er echt zijn.

## Pakketten fase 1
Uitvoerders: Codex voor logica en tests, Copilot voor interface, Hermes voor kleine vaste teksten (altijd met `--verwacht`), Claude voor opzet en wat niet in een kleine taak past. Pakketten in één golf raken nooit dezelfde bestanden.

Pakket 0 zet elk later bestand alvast klaar als lege module, en koppelt alles aan elkaar: `server.mjs` kent alle API-paden, `main.js` laadt alle schermen. Elk pakket vult daarna alleen zijn eigen bestand. Zo kunnen Codex en Copilot tegelijk werken zonder elkaars bestanden aan te raken.

| Nr | Titel | Bestanden | Uitvoerder | Hangt af van | Golf |
|---|---|---|---|---|---|
| 0 | Skelet, model en testvoorbeelden | `app/package.json`, `app/server.mjs` met alle API-paden, `app/public/js/main.js` met alle schermen, een lege module voor elk later pakket, `docs/model.md`, `app/test/voorbeelden/*.musicxml`, projectregels in `AGENTS.md`, `CLAUDE.md`, `werkpakketten/00-werkwijze.md`, `hermes/regels-controle.mjs`, `.claude/launch.json` | Claude | | 0 |
| 1 | Toonhoogte: noot naar MIDI-nummer en terug, halve tonen | `app/src/model/toonhoogte.mjs` | Codex | 0 | 1 |
| 2 | Duur: deelwaarden, maatsoort naar verwachte maatlengte | `app/src/model/duur.mjs` | Codex | 0 | 1 |
| 3 | Basispagina: kop, uploadvlak, lege stand | `app/public/index.html`, `app/public/app.css` | Copilot | 0 | 1 |
| 4 | Woordenlijst van de muziektermen in de app | `docs/woordenlijst.md` | Hermes | 0 | 1 |
| 5 | MusicXML lezen: partijen, maten, noten, rusten, stemmen | `app/src/musicxml/lezen.mjs` | Codex | 1, 2 | 3 |
| 6 | MusicXML lezen: sleutel, voortekens, maatsoort, tempo, dynamiek, articulatie | `app/src/musicxml/aanwijzingen.mjs` | Codex | 1, 2 | 2 |
| 7 | Controle maatduur: maten met een onverwachte duur | `app/src/controle/maatduur.mjs` | Copilot | 2 | 2 |
| 8 | Uploaden in de browser en het resultaat tonen | `app/public/js/upload.js` | Copilot | 3 | 2 |
| 9 | API: MusicXML ontvangen, model en meldingen teruggeven | `app/src/server/importeer.mjs` | Codex | 5, 6, 7 | 4 |
| 10 | MIDI schrijven: een spoor per partij, tempo, volume | `app/src/midi/schrijven.mjs` | Codex | 1, 2 | 2 |
| 11 | Notatie tekenen met Verovio | `app/public/js/weergave.js` | Claude (lastige koppeling, daarna kleine taken voor Copilot) | 3 | 3 |
| 12 | Meldingen tonen: welke maat, wat er mis is, springen naar de maat | `app/public/js/views/meldingen.js` | Copilot | 7, 8 | 3 |
| 13 | Speler: afspelen, pauze, tempo, passage herhalen | `app/public/js/speler.js` | Claude (koppeling met spessasynth), daarna Copilot | 10, 11 | 4 |
| 14 | Mixer: volume en dempen per partij | `app/public/js/views/mixer.js` | Copilot | 13 | 4 |
| 15 | MusicXML schrijven: model terug naar MusicXML | `app/src/musicxml/schrijven.mjs` | Codex | 5, 6 | 4 |
| 16 | Project bewaren en openen | `app/src/project/opslag.mjs`, API in `app/src/server/projecten.mjs` | Codex | 9 | 4 |
| 17 | Export-knoppen MusicXML en MIDI | `app/public/js/views/export.js` | Copilot | 10, 15 | 5 |
| 18 | Projectenlijst: bewaarde projecten openen | `app/public/js/views/projecten.js` | Copilot | 16 | 5 |
| 19 | Eindcontrole fase 1 en gebruikersuitleg | `README.md`, plan bijwerken | Claude | alles | 5 |

Pakket 0b (Claude, golf 1): `app/src/musicxml/xml.mjs`, een kleine XML-hulp die de volgorde van elementen bewaart, met tests. Pakket 5 en 6 bouwen erop. Daardoor komt 6 (aanwijzingen) in golf 2 en 5 (lezen, gebruikt 6) in golf 3.

Pakketten groter dan 150 regels knip ik bij het klaarzetten verder op (bijvoorbeeld 5 in "partijen en maten" en "noten en stemmen").

## Tests
Tests gaan voor de code. Claude schrijft per golf eerst de tests, of zet de exacte testcode in een pakket voor Codex; het pakket met de code noemt die tests in zijn criteria.

| Test | Wat | Voor pakket |
|---|---|---|
| `app/test/toonhoogte.test.mjs` | C4 is 60, Fis5 is 78, enkele mollen en kruisen, halve tonen tussen twee noten | 1 |
| `app/test/duur.test.mjs` | 4/4 en 6/8 naar maatlengte, punteringen, triolen | 2 |
| `app/test/lezen.test.mjs` | de voorbeelden: aantal partijen, maten en noten, toonhoogte en duur van vaste noten, twee stemmen | 5 |
| `app/test/aanwijzingen.test.mjs` | sleutel, voortekens, maatsoort, tempo, dynamiek en articulatie uit de voorbeelden | 6 |
| `app/test/maatduur.test.mjs` | het foute voorbeeld geeft precies de maten met een verkeerde duur; een opmaat is geen fout | 7 |
| `app/test/importeer.test.mjs` | de API geeft model en meldingen, en een nette fout bij een kapot bestand | 9 |
| `app/test/midi.test.mjs` | kop en sporen kloppen, noot aan en uit op de juiste tijd, tempo-event | 10 |
| `app/test/schrijven.test.mjs` | lezen, schrijven en weer lezen geeft hetzelfde model | 15 |
| `app/test/opslag.test.mjs` | bewaren en openen in een tijdelijke map, en geen paden buiten de projectmap | 16 |

De interface (pakketten 3, 8, 11 tot 14, 17 en 18) controleert Claude in de browser op 1366 en 375 px breed.

## Open vragen voor Mels
Niets hiervan houdt fase 1 tegen.
1. **Audiveris installeren (voor fase 2):** Audiveris moet eenmalig op je computer, om de herkenning te bouwen en te testen. Ik zeg het als het zover is; installeren doe jij.
2. **Hosting (voor fase 5):** een gratis plan is te klein voor Audiveris. Een kleine server kost ongeveer 5 euro per maand. Wat wil je daaraan uitgeven?
3. **Partituren van anderen (voor fase 5):** online uploaden gebruikers bladmuziek waar auteursrecht op kan zitten. Dan hoort er een korte gebruiksvoorwaarde bij, en de bestanden blijven privé per gebruiker.
