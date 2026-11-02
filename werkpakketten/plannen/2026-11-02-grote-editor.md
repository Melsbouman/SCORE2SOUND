# Grote editor met lint, selectie, titelgegevens en PDF

Stand: 2 november 2026, nacht. Mels gaf de opdracht en liet de keuzes aan Claude.

## Idee
De partij in de editor is nu klein (een derde van het scherm, naast het origineel en de speler) en de regels lopen te snel. Mels wil één groot editorscherm, zoals Noteflight: bovenin een **lint** (functieboom) met tabbladen zoals Word, waarin ook het tempo en het afspelen zitten, de partituur groot eronder, noten en maten die je met de muis goed kunt aantikken, de titel, componist en arrangeur aanpasbaar, en een PDF met het watermerk SCORE2SOUND.

## Keuzes
- **Het origineel-paneel verdwijnt uit het scherm** (Mels: "mag van mij weg"). De code van `origineel.js` blijft in de repository staan, maar wordt niet meer gestart.
- **Lint met tabbladen** (Bestand, Start, Noten, Partij, Weergave): een nieuw `views/lint.js` verplaatst de bestaande vlakken (`#speler`, `#tempo`, `#editor`, `#export`, `#projecten`, `#bewerken`, `#mixer`, `#versies`) naar het juiste tabblad. De vlakken en hun id's blijven; de schermen werken dus door.
- **Partituur over de volle breedte**, groter getekend (schaal omhoog, meer maten per regel).
- **Selectie met de muis:** een klik raakt de dichtstbijzijnde noot binnen een straal van 14 px (niet alleen de kleine notenkop); een klik op een lege plek van een maat kiest die maat (`kies-maat`, gemarkeerd met een lichte achtergrond). Slepen blijft werken.
- **Arrangeur** is een nieuw veld in het model (`arrangeur`, alleen als het is ingevuld); in MusicXML `<creator type="arranger">`.
- **PDF:** zonder nieuwe bibliotheek, via de afdrukfunctie van de browser ("Opslaan als PDF"), met een schuin watermerk SCORE2SOUND op elke pagina via `print.css`. Een echte server-PDF zou een nieuwe bibliotheek vragen en valt buiten dit plan.

## Pakketten
| Golf | Pakket | Bestanden | Uitvoerder | Issue |
|---|---|---|---|---|
| 0 | Twee stylesheets koppelen in index.html | `public/index.html` | Hermes | |
| 1 | Titelgegevens in model en MusicXML (arrangeur), met test | `src/model/titelgegevens.mjs`, `src/musicxml/*.mjs`, `docs/model.md`, test | Codex | |
| 1 | PDF met watermerk | `public/print.css`, `public/js/views/export.js` | Copilot | |
| 1 | Muisselectie van noten en maten | `public/js/weergave.js`, `public/editor.css` | Codex | |
| 1 | Groot scherm: origineel weg, partituur over de volle breedte | `public/app.css`, `public/index.html`, `public/js/main.js` | Copilot | |
| 2 | Lint met tabbladen (verplaatst de vlakken) | `public/js/views/lint.js`, `public/js/main.js`, `public/editor.css` | Copilot | |
| 2 | Formulier voor titel, componist en arrangeur | `public/js/views/titel.js`, `public/index.html`, `public/js/main.js` | Copilot | |
| 2 | Groter tekenen, meer maten per regel | `public/js/weergave.js` | Codex | |

## Tests
`titelgegevens.test.mjs` (in golf 1, met de taak meegegeven). De rest is interface: per taak een `--controle` op syntax, en Claude kijkt na elke golf één keer in de browser (1366 en 375 px).
