# Alles in de browser: eigen herkenning, geen server (9 november 2026)

## Idee
SCORE2SOUND wordt één website die helemaal in de browser van de klant draait. Er is alleen een domeinnaam met gratis statische hosting nodig, en geen eigen server. Het herkennen van bladmuziek doet de app zelf, met eigen code die de functies van Audiveris overneemt die wij gebruiken: notenbalken, maten, noten, rusten, meermaatsrusten, sleutels, voortekening, maatsoort, herhalingen en cijfers. Audiveris verdwijnt uit de app.

## Wat nu nog een server nodig heeft
| Onderdeel | Nu | Straks |
|---|---|---|
| Herkennen (`/api/herken`, `/api/proef`) | Audiveris (Java) en Windows-OCR/Tesseract op de server | Eigen herkenning in de browser (Web Worker) |
| Projecten (`/api/projecten`) | Eén JSON-bestand per project op de server | In de browser (IndexedDB), met een knop om een project als bestand te bewaren en te openen |
| Accounts (`/api/account`) | Inloggen op de server | Inloggen met Google in de browser; projecten in de eigen Google Drive van de klant (verborgen app-map) |
| MusicXML/.mxl openen (`/api/importeer`) | Op de server (Buffer) | In de browser (`fflate` is al aanwezig) |
| Pdf-export (`/api/pdf`) | pdfkit op de server; afdrukken als terugval | In de browser (uitzoeken: pdfkit in de browser of eigen kleine pdf-schrijver) |

De herstelketen na Audiveris (`herstelHerkenning`, `vulRustGaten`, `herstelTriolen`, maatduur, meldingen) is gewone JavaScript en gaat mee. Die stappen verwachten de bladindeling zoals Audiveris die gaf: maten met `vak`, regelbegin, en de plek van letters en woorden. De eigen herkenning levert dezelfde velden, zodat de keten blijft werken.

## Besluiten van Mels (9 nov)
1. Eerste versie alleen losse partijen (één notenbalk, één stem).
2. Accounts wel, maar zonder eigen server: inloggen met Google (OAuth) in de browser.
3. Bouw de werkwijze van Audiveris na, met eigen code; onderzoek zelf wat het beste past.
4. Audiveris blijft tijdelijk alleen op de pc van Mels, als meetlat.

## Werkwijze naar het voorbeeld van Audiveris
De openbare handleiding van Audiveris (audiveris.github.io, *Steps internals*) beschrijft 20 stappen. De eerste 9 staan er uitgewerkt in:
- BINARY maakt het beeld zwart-wit.
- SCALE meet lijndikte, lijnafstand en balkdikte uit histogrammen van verticale zwarte en witte stukken.
- GRID zoekt notenbalklijnen als lange, dunne "draden" en groepeert die tot balken van 5 lijnen. Maatstrepen vindt het als pieken in een verticale projectie, en systemen als maatstrepen die doorlopen tussen de balken. Daarna haalt het de lijnen weg.
- HEADERS leest sleutel, voortekening en maatsoort aan het begin van elke balk.
- STEM_SEEDS, BEAMS, LEDGERS en HEADS zoeken stokken, balken en hulplijnen. Nootkoppen zoekt HEADS met sjablonen en een afstandskaart, langs de lijnen en hulplijnen.

Wij volgen dezelfde volgorde en dezelfde ideeën. Ideeën en werkwijzen zijn vrij; code is dat niet. We lezen daarom alleen de handleiding en de vakliteratuur, niet de Java-broncode, en schrijven alles zelf. Elke stap is een eigen module in `app/src/herkenning/`:

| Stap (Audiveris) | Onze module | Wat hij geeft |
|---|---|---|
| LOAD, BINARY | `beeld.mjs` | grijs- en zwart-witbeeld (`Uint8Array`, breedte, hoogte) |
| SCALE | `schaal.mjs` | lijndikte, lijnafstand, balkdikte |
| GRID | `raster.mjs` | balken (5 lijnen, links/rechts, helling), systemen, maatstrepen, maten met `vak`, beeld zonder lijnen |
| HEADERS | `kop.mjs` | sleutel, voortekening, maatsoort per balk |
| STEM_SEEDS, STEMS | `stokken.mjs` | stokken |
| BEAMS | `balken.mjs` | waardestrepen (balken) |
| LEDGERS | `hulplijnen.mjs` | hulplijnen |
| HEADS | `koppen.mjs` | nootkoppen (sjablonen uit Bravura, afstandskaart) |
| SYMBOLS | `symbolen.mjs` | rusten, voortekens, punten, vlaggen, H-balk van een meermaatsrust, herhaaltekens |
| TEXTS | `cijfers.mjs` | cijfers en letters: aantal maten, repetitiecijfers, maatnummers |
| MEASURES, CHORDS, RHYTHMS, PAGE | `opbouw.mjs` | het model van `docs/model.md`, met `vak`, `regelbegin` en `plek` zoals de herstelketen verwacht |

## Inloggen met Google, zonder server
- Google Identity Services (het inlogscript van Google) geeft in de browser een toegangssleutel. De app bewaart projecten met de Drive-API in de verborgen app-map van de klant (`appDataFolder`, alleen het recht `drive.appdata`).
- Er is geen eigen server en geen wachtwoord bij ons. Zonder inloggen werkt de app ook: dan staan de projecten alleen in de browser.
- Nodig van Mels: een Google Cloud-project met een OAuth-client-ID, met het eigen domein (en `localhost` voor testen) als toegestane herkomst. Dat is gratis.
- De beveiligingsregels van de site (CSP) moeten het script van `accounts.google.com` en de Drive-API toestaan.

## Keuzes
- **Geen Audiveris-code.** Audiveris is AGPL; onze code is "alle rechten voorbehouden". We lezen geen Audiveris-broncode om na te bouwen. We gebruiken bekende, openbare technieken uit de vakliteratuur over muziekherkenning: projectieprofielen voor notenbalken, het weghalen van notenbalklijnen, losse vormen zoeken, en sjablonen of een klein eigen netwerk voor symbolen.
- **Eerste versie: losse partijen** (besluit 1). Eén notenbalk, één stem: brasspartijen zoals de 2nd Cornet. Partituren met meer balken, akkoorden en twee stemmen komen later.
- **Eerst digitale pdf's, dan scans.** Een digitale pdf (Devils Galop, African Symphony) bevat de tekens zelf; die lezen is betrouwbaarder dan herkennen. Scans (JPEG, gewone compressie of faxcodering in de pdf) worden in de browser uitgepakt en daarna herkend.
- **Geen nieuwe bibliotheken in de app.**
  - Pdf: eigen pdf-lezer. JPEG laat de browser zelf zien, gewone compressie gaat via `fflate` of `DecompressionStream`, en voor faxcodering schrijven we een eigen decoder.
  - Symbolen: eerst sjablonen getekend uit het lettertype Bravura (OFL, staat al in de app).
  - Netwerk: komt er later een klein netwerk, dan draait dat met eigen JavaScript-code.
- **Meten blijft de maat.** De scanmeting (`automatisering/scanmeting.mjs`) krijgt de eigen herkenning als tweede motor. Audiveris blijft tijdelijk alleen op de pc van Mels als meetlat, niet in de app. Hij gaat weg zodra de eigen herkenning op de testset minstens even goed is.
- **Werkt in Node én in de browser.** De herkenningsmodules (`app/src/herkenning/`) gebruiken alleen `Uint8Array` en gewone JavaScript, geen `node:`-modules, zodat ze in Node getest worden en in de browser draaien.
- **Buiten dit plan:** foto's met telefoon (scheef, schaduw), handgeschreven muziek, slagwerk, en partituren met meerdere balken (komen later). Betaald scannen is zonder server niet af te dwingen; dat komt later.

## Fasen en pakketten
Golf 1 kan nu beginnen; de latere golven worden per golf uitgewerkt, met de uitslag van de vorige.

| Nr | Titel | Bestanden | Uitvoerder | Hangt af van | Golf | Stand |
|---|---|---|---|---|---|---|
| A1 | Projecten in de browser (IndexedDB), bewaren en openen als bestand | `app/public/js/opslag.js` (nieuw), `views/projecten.js`, `views/begin.js` | Claude-uitvoerder | – | 1 | klaar (#1825) |
| A2 | MusicXML en .mxl openen in de browser | `app/src/import/importeer.mjs` (nieuw, uit `server/importeer.mjs`), `upload.js`, `views/bewerken.js`, `views/voorbeeld.js` | Claude-uitvoerder | – | 1 | klaar (#1824, spoed #1828) |
| B1 | Pdf-lezer voor de browser: objecten, streams, pagina's, tekens, zonder `Buffer`/`zlib` | `app/src/pdf/lezer.mjs` (nieuw), `app/src/pdf/tekens.mjs` (nieuw) | Claude | – | 1 | klaar (#1833) |
| C1 | Beeld en schaal (BINARY, SCALE): grijs, zwart-wit, lijndikte en lijnafstand uit histogrammen | `app/src/herkenning/beeld.mjs`, `schaal.mjs` | Claude | – | 1 | klaar (#1829) |
| C2 | Raster (GRID, deel 1): notenbalklijnen als draden, balken van 5 lijnen, helling, links en rechts | `app/src/herkenning/raster.mjs` | Claude | C1 | 1 | klaar (#1829) |
| B2 | Paginabeelden uit een pdf: JPEG, gewone compressie, faxcodering (CCITT G4) | `app/src/pdf/beelden.mjs`, `app/src/pdf/ccitt.mjs` | Claude-uitvoerder | B1 | 2 | klaar (#1834, #1836) |
| C3 | Raster (GRID, deel 2): maatstrepen, systemen, maten met `vak`, beeld zonder lijnen | `app/src/herkenning/raster.mjs` | Claude | C2 | 2 | klaar (#1837, in maten.mjs) |
| C4 | Notenbalklijnen weghalen en losse vormen zoeken | `app/src/herkenning/vormen.mjs` | Claude-uitvoerder | C2 | 2 | klaar (#1830) |
| D1 | Digitale pdf: notenbalken uit lijnen en tekens uit het lettertype, direct naar het model | `app/src/herkenning/digitaal.mjs` | Claude | B1 | 2 | open: lettertype tekenen of pdf.js |
| A3 | Pdf-export in de browser | `views/export.js`, eigen pdf-schrijver of pdfkit in de browser | Claude-uitvoerder | – | 2 | deel 1 klaar (#1839, #1842); deel 2 bezig (#1843) |
| C5 | Symbolen: nootkoppen, rusten, sleutels, voortekens, cijfers van de maatsoort, punten, balken, stokken, vlaggen, H-balk | `app/src/herkenning/symbolen.mjs`, `sjablonen.mjs` | Claude | C3, C4 | 3 | koppen (#1838), duur (#1841), rusten (#1844), balkkop en voortekens (`kop.mjs`, `voortekens.mjs`, 9 nov avond); cijfers boven meermaatsrusten open |
| C6 | Muziek opbouwen voor één stem: toonhoogte, duur, maatsoort, voortekening, meermaatsrust | `app/src/herkenning/opbouw.mjs` | Claude | C5 | 3 | klaar (9 nov avond; Devils Galop na herstelketen 102/102 maten goed) |
| C7 | Cijfers en letters: aantal maten boven een meermaatsrust, repetitiecijfers, maatnummers | `app/src/herkenning/cijfers.mjs` | Claude-uitvoerder | C4 | 3 | open |
| C8 | Keten in de browser: Web Worker, voortgang, bestaande herstelketen, scan als concept in de editor | `app/public/js/herken-worker.js`, `upload.js`, `app/src/herkenning/keten.mjs`, `bladen.mjs` | Claude | C6, C7 | 4 | gebouwd (9 nov avond): scans en foto's in de browser, digitale pdf via de server |
| C9 | Scanmeting met de eigen herkenning naast Audiveris | `automatisering/scanmeting.mjs`, `app/src/meting/` | Claude-uitvoerder | C6 | 4 | open |
| A5 | Inloggen met Google en projecten in de Google Drive van de klant (`appDataFolder`) | `app/public/js/google.js` (nieuw), `app/public/js/opslag.js`, `views/inloggen.js`, CSP in `app/server.mjs` | Claude | A1, client-ID van Mels | 3 | open (client-ID van Mels) |
| A4 | Server en wachtwoord-accounts weg, statische site, hosting-uitleg (domeinnaam + Cloudflare Pages of GitHub Pages) | `app/server.mjs`, `docs/online.md`, `automatisering/statisch.sh` | Claude-uitvoerder en Hermes | C8, A5 | 5 | open |

## Tests
Tests gaan voor de code, in hetzelfde pakket.
- **A1:** opslaan, lijst, openen en verwijderen via een opslag met een geheugen-variant voor Node; een project als bestand bewaren en terugzetten.
- **A2:** de bestaande `importeer`-tests draaien op de nieuwe module, met `Uint8Array` in plaats van `Buffer`.
- **B1:** een kleine eigen pdf (gemaakt met `automatisering/maak-pdf.mjs` uit een synthetisch stuk) geeft dezelfde tekens als de huidige `pdftekens.mjs`.
- **C1 en C2:** synthetische pagina's (eigen stukken, met Verovio getekend en met PyMuPDF naar PNG gezet, klein in het repo): het juiste aantal balken, de lijnafstand tot op 1 pixel, ook licht scheef en met ruis.
- **Meting per golf:** `scanmeting.mjs` op de testset (synthetisch, vervuild, Devils Galop met de referentie van Mels).

## Wat het oplevert en wat het kost
- Geen server meer: een domeinnaam (ongeveer 10 tot 15 euro per jaar) en gratis statische hosting.
- Klanten installeren niets. Hun bladmuziek verlaat hun computer niet, wat goed is voor de privacy.
- Eerlijke verwachting:
  - Een eigen herkenning op het niveau van Audiveris is weken tot maanden werk.
  - Digitale pdf's kunnen snel goed worden, en schone scans van losse partijen ook.
  - Slechte scans blijven het lastigst.
  - De eerste versie scant slechter dan Audiveris; de meting laat zien wanneer hij even goed is.

## Open punten
- Voor A5 (inloggen met Google) is een OAuth-client-ID van Mels nodig. Daar is het nog niet nodig: dat komt in golf 3.
- Of de sjablonen voor nootkoppen uit Bravura in de browser getekend worden (canvas) of vooraf als bestand worden gemaakt, beslist pakket C5.
