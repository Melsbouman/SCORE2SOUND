# Begin-scherm: scannen of een leeg blad, in de stijl van de voorpagina

## Idee
Het huidige scherm Nieuw stuk is een lange rij velden en vinkjes: lelijk en niet duidelijk. Mels wil een stap-voor-stap opzet in de stijl van de voorpagina (crème, groen, Bodoni Moda voor koppen, ronde knoppen):
1. **Begin:** twee grote kaarten: Bladmuziek inscannen (pdf of foto slepen of kiezen) en Leeg blad. Onder: Verder werken met de laatste stukken.
2. **Voor wie schrijf je?** Kaarten voor combinaties (brassband, strijkkwartet, houtblazers, piano, solo, eigen keuze) en bij eigen keuze instrumenten als aan te klikken blokjes per familie.
3. **Details:** titel, componist, maatsoort, toonsoort, tempo, aantal maten, met een samenvatting van het stuk, en de knop Maak mijn stuk.
De tekst "Score editor" boven de pagina past niet bij de voorpagina en wordt vervangen door een rustige kop in dezelfde stijl.

## Keuzes
- Hergebruik `maakLeegStuk` en de bestaande upload; geen nieuwe bibliotheken; alleen de zichtbare opmaak en stappen veranderen.
- Pure logica (instrumenten per familie) staat in `app/src/model/nieuw.mjs` met een test.
- Buiten dit plan: donkere modus (komt later), accounts-instellingen.

## Pakketten
| Nr | Titel | Bestanden | Uitvoerder | Hangt af van |
|---|---|---|---|---|
| 1 | Instrumentenfamilies en kaarten voor combinaties (logica en test) | app/src/model/nieuw.mjs, app/test/instrumentfamilies.test.mjs | Codex | |
| 2 | Stap 1 en 2: Begin-scherm met twee kaarten en de keuze voor wie je schrijft | app/public/js/views/begin.js, app/public/begin.css, app/public/index.html, app/public/js/main.js | Codex | 1 |
| 3 | Stap 3: details, samenvatting en Maak mijn stuk; oud formulier verdwijnt | app/public/js/views/begin.js, app/public/js/views/nieuw.js, app/public/begin.css | Codex | 2 |
| 4 | Kop "Score editor" vervangen en de lege weergavebalk verbergen | app/public/index.html, app/public/shell.css, app/public/app.css | Codex | 3 |
| 5 | Polijsten: toetsenbord, 375 px, beweging verminderen, Verder werken-kaarten | app/public/begin.css, app/public/js/views/begin.js | Codex | 4 |
| 6 | Hermes: documentatie van het nieuwe begin-scherm | docs/gebruik.md | Hermes | 5 |
