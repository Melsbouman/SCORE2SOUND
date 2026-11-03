# Echte muziekeditor, zoals Noteflight

## Idee
Mels wil dat de editor aanvoelt als Noteflight: een noot aantikken en meteen kunnen veranderen, verwijderen, vervangen, slepen, met pijltjes in halve tonen, en maten of een heel stuk kopiëren en plakken. De knoppenbalk moet zwart en netjes zijn. Tempo- en spelaanduidingen staan altijd boven de balk, sterkte (cresc., dim., p, mf, f) altijd eronder, uit een bibliotheek te kiezen. De partijnaam staat linksboven, met de stemming (bijvoorbeeld "in B♭"). De arrangeur staat onder de componist ("arr. ..."). Het stuk moet los van de pagina in- en uitgezoomd kunnen worden.

## Keuzes
- **Geen nieuwe bibliotheken.** Alles in het bestaande model (`app/src/model/`) en de bestaande views.
- **Model eerst, met tests.** Elke nieuwe bewerking is een functie in `app/src/model/` met een test die Claude meegeeft in de taak. De interface volgt.
- **Pijl omhoog of omlaag** gaat per halve toon (omhoog met kruisen, omlaag met mollen). Shift met pijl blijft een octaaf.
- **Letters A tot en met G** voeren een noot in op een gekozen rust, of vervangen de gekozen noot (dichtstbijzijnde octaaf).
- **Meerdere maten kiezen:** shift-klik op een tweede maat kiest de reeks. Ctrl+C en Ctrl+V kopiëren en plakken die reeks voor alle partijen.
- **Plaatsing:** tempo, expressie, spelwijze en structuur boven de balk; dynamiek (p tot ff, sf) en cresc./dim. eronder.
- **Titel in de kop:** "Score editor" (Mels koos dat boven de slogan).
- **Buiten dit plan:** noten slepen naar een andere maat (alleen toonhoogte slepen blijft), en meerdere losse noten kiezen met een rechthoek.

## Pakketten
| Nr | Titel | Bestanden | Uitvoerder | Golf |
|---|---|---|---|---|
| 1 | Kop: "Score editor" | index.html | Copilot | 1 |
| 2 | Knoppenbalk zwart en netjes | editor.css | Copilot | 1 |
| 3 | Triool-knop met symbool | muzieksymbolen.js, editor.js | Copilot | 1 |
| 4 | Tempoteken kleiner | editor.css | Copilot | 1 |
| 5 | verschuifHalvetoon + test | corrigeren.mjs | Codex | 1 |
| 6 | nootBijLetter + test | corrigeren.mjs | Codex | 1 |
| 7 | kopieerMaten + test | corrigeren.mjs | Codex | 1 |
| 8 | Aanduidingenbibliotheek + plaatsing, test | aanduidingen.mjs | Codex | 1 |
| 9 | Stemming ("in B♭") + test | stemming.mjs | Codex | 1 |
| 10 | Pijlen per halve toon in de editor | editor.js | Copilot | 2 |
| 11 | Letters A-G voeren noten in | editor.js | Copilot | 2 |
| 12 | Meerdere maten kiezen (shift-klik) | weergave.js | Codex | 2 |
| 13 | Kopiëren en plakken van een reeks maten | editor.js | Copilot | 3 |
| 14 | Plaatsing boven/onder in het schrijven | schrijven.mjs | Codex | 2 |
| 15 | voegAanwijzingToe + test, tab Aanduidingen | corrigeren.mjs, views/aanduidingen.js | Codex, Copilot | 3 |
| 16 | Partijnaam en arrangeur in het titelblok | weergave.js, schrijven.mjs | Codex | 3 |
| 17 | Zoom van het stuk los van de pagina | weergave.js | Codex | 2 |
| 18 | Dynamiek 'mf' in het muzieklettertype | schrijven.mjs | Codex | 2 |

## Tests
Pakketten 5 tot en met 9 hebben elk een testbestand dat in de taak staat. Pakket 14 en 18 krijgen een test in de taak.

## Open vragen
Geen; Mels is er overdag en kijkt mee.
