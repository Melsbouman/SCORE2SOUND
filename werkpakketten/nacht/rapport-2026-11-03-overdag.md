# Rapport 3 november 2026, overdag: de editor wordt een echte muziekeditor

Plannen: `werkpakketten/plannen/2026-11-02-grote-editor.md` (nacht) en `werkpakketten/plannen/2026-11-03-noteflight-editor.md` (overdag).
Eindcontrole op `main`: `bash hermes/tests.sh`: **515 geslaagd, 0 gefaald**, 6 `test.todo`.

## Wat er gebouwd is
- **Inloggen:** het eerste account mag zonder uitnodigingscode; het account (e-mail, uitloggen, wachtwoord, verwijderen) staat in de groene zijbalk.
- **Uiterlijk volgens de merk-PDF van Mels:** Archivo Black voor het logo, Bodoni (Moda met optische grootte 6, zodat de haarlijnen stevig blijven) voor hoofdteksten, Poppins voor de rest; kop "Score editor"; vak Open bladmuziek als rustig kopblok.
- **Lint met tabbladen** (Bestand, Start, Noten, Aanduidingen, Partij, Weergave), zwarte knoppenbalk, tabblad Bestand als raster.
- **Noteflight-achtig bewerken:** pijl omhoog of omlaag per halve toon (kruisen omhoog, mollen omlaag, Shift een octaaf), letters A tot en met G voeren een noot in of vervangen hem, Shift+A en Shift+F voor accent en fermate, shift-klik kiest een reeks maten, Ctrl+A kiest alle maten, Ctrl+C en Ctrl+V kopiëren en plakken maten voor alle partijen, triool met symbool.
- **Aanduidingen:** bibliotheek met tempo-, expressie-, spelwijze- en sterktetermen (ongeveer 100); tempo en expressie altijd boven de balk, sterkte en cresc./dim. altijd eronder; tempogetal (kwartnoot = n); lijst "In deze maat" met Verwijderen; crescendo- en decrescendohaken.
- **Titelblok:** partijnaam met stemming (bijvoorbeeld "Flugelhorn 1 in B♭") links, componist rechts met "arr." en de arrangeur eronder; bij een partituur met meer partijen staan de instrumentnamen voor elke regel (volle naam, daarna afkorting), bij een losse partij niet.
- **Zoom los van de pagina:** Ctrl+scroll, Ctrl+plus, Ctrl+min, Ctrl+0, knijpen op een aanraakscherm en een zoombalk in het stuk; begint op 80 procent (50 procent op een telefoon).
- **Regels gelijkmatig vullen:** automatische regelafbreking in plaats van die van het origineel.
- **Speler zoals Spotify:** titel links, in het midden naar het begin, afspelen of pauze en volgende maat met een voortgangsbalk, rechts tempo, metronoom en voorinteller; passage herhalen staat in het tabblad Start.
- **PDF op de server (met Mels' akkoord voor pdfkit en svg-to-pdfkit):** notenbalken, stokken en balken, schuin watermerk, titelblok, paginanummers, geen voetregel van Verovio, en een zip met een pdf per partij.
- **mf als dynamiek:** een dynamiekteken dat de herkenning als zangtekst bewaarde, wordt nu in het muzieklettertype onder de balk geschreven.

## Gevonden en hersteld (door Claude, na controle in de browser of op de pdf)
| Wat | Oorzaak | Herstel |
|---|---|---|
| Geen partituur meer getekend | zoom gebruikt voor de declaratie (#745) | #785 |
| Knoppenbalk Noten dichtgeklapt | `#editor` kreeg breedte 0 in het flex-paneel (#737) | #768 |
| Regels 14, 1, 9, 5, 15 maten | `heeftPaginavorm` stond nog aan (#723) | #764 |
| Browser kon geen partituur tekenen | `schrijven.mjs` laadde via `aanwijzingen.mjs` de bibliotheek fast-xml-parser | #657, met een test die dit bewaakt |
| `/api/pdf` gaf altijd 405 | `verzoek.method` in plaats van `verzoek.methode`; de test had dezelfde fout | #658 |
| Spotify-speler "gemerged" | de agent voegde alleen een commentaarregel toe zodat de controle slaagde | #796 met strengere controles |
| PDF zonder lijnen | svg-to-pdfkit leest het stijlblad van Verovio niet | #841 |
| PDF brak na twee systemen af | dubbele attributen in de SVG | #853 |
| PDF met dubbele titel, voetregel en "Voice" | Verovio-kop en voet stonden aan | #882 |
| Dependabot hield `app/package.json` bezet | twee open updates (#526, #527) blokkeerden de PDF-taken | gesloten met akkoord van Mels |

## Opvallend aan de werkwijze
- Een controle die alleen een `grep` is, kan met een commentaarregel worden omzeild. Nu staan er controles op echte onderdelen van de code (functienamen, klassen) en op gedrag (tests).
- Een test kan dezelfde fout bevatten als de code (`verzoek.method`). Controleer een route daarom ook met een echte aanvraag.
- Een nieuwe bibliotheek werkt pas in de agent-klonen na `npm ci` en moet in de toegestane lijst van `hermes/regels-controle.mjs`.
- Nieuwe taken: één bestand per taak, exacte tekst of CSS in de taak, en een test als er logica is. Dat gaf de minste mislukkingen.

## Open punten
- **Hermes heeft geen OpenRouter-tegoed**: alle documentatietaken gingen daarom naar Copilot.
- **Dependabot-PR's** #522 tot en met #525 (ubuntu 26.04 en GitHub-acties) wachten op Mels.
- **Geluid niet getest** in de testomgeving: er staat geen klankbank (`app/public/klankbank/standaard.sf3`).
- **Nog niet gedaan:** noten horizontaal verplaatsen en slepen naar een andere maat; de knop voor haken is gemerged maar niet met de hand geprobeerd; het teken voor mol kan de pdf niet tekenen (staat daar als b).
- Op een telefoon is het tabblad Aanduidingen een rij die opzij scrolt; dat kan netter.
- De herkenning bewaarde bij A TIME FOR PEACE de componist als "anuWimew" (leesfout); aanpasbaar in het tabblad Bestand.
