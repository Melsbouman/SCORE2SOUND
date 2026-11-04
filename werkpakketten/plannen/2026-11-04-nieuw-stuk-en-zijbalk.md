# Eigen muziek schrijven, een nettere zijbalk en projecten

## Idee
Mels wil naast het inscannen ook zelf muziek kunnen schrijven: beginnen met een lege pagina, voor elk instrument, en meerdere balken onder elkaar zetten tot een partituur. De zijbalk moet netter en gevuld zijn: inscannen, bewerken, een projectenmap met recente stukken en beginnen met een leeg stuk.

## Keuzes
- Een leeg stuk is gewoon een partituur in het bestaande model (`docs/model.md`) met maatrusten. Daarom werken editor, speler, export en opslaan meteen mee.
- Een partituur met meerdere balken onder elkaar is een partituur met meerdere partijen; een weergave-keuze toont ze samen of per partij.
- Geen nieuwe bibliotheken. Instrumenten komen uit `app/src/model/instrumenten.mjs`.
- Buiten dit plan: notatie met losse balken voor piano (twee balken in één partij met accolade), slagwerknotatie, tekst invoeren met toetsenbord-MIDI.

## Pakketten
| Nr | Titel | Bestanden | Uitvoerder | Hangt af van | Golf |
|---|---|---|---|---|---|
| 1 | maakLeegStuk, voegPartijToe, verwijderPartij | app/src/model/nieuw.mjs (test staat klaar: werkpakketten/plannen/nieuw-stuk.test.mjs.voorbeeld) | Codex | | 1 |
| 2 | Scherm Nieuw stuk (titel, instrumenten, maatsoort, toonsoort, tempo, aantal maten) | app/public/js/views/nieuw.js, app/public/js/main.js, app/public/index.html | Codex | 1 | 2 |
| 3 | Zijbalk netter en gevuld, met recente projecten | app/public/index.html, app/public/shell.css, app/public/js/views/projecten.js | Codex | 2 | 3 |
| 4 | Partij toevoegen en weghalen in de editor | app/public/js/views/mixer.js | Codex | 1 | 2 |
| 5 | Weergave: partijen onder elkaar of een losse partij | app/public/js/weergave.js | Codex | | 2 |

## Tests
Pakket 1 heeft zijn test al (`werkpakketten/plannen/nieuw-stuk.test.mjs.voorbeeld`, wordt gekopieerd naar app/test). De pakketten 2 tot en met 5 zijn interface; die controleert Claude eenmalig in de browser op 1366 en 375 px.

## Open vragen
Geen; Mels kan de gekozen keuzes bijsturen.
