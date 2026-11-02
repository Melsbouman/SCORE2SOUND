# Plan: fase 4 afronden en de voorraad wegwerken

Stand: gestart op 2 november 2026.

## Idee
Fase 4 mist alleen nog audio-export. Daarnaast staan er in de voorraad kleine punten die fase 5 voorbereiden (Verovio inpakken, herkenningen opruimen) en die de herkenning beter maken (een mislukte pagina opnieuw op 400 dpi). Ook bleek bij het nakijken dat "versies naast elkaar vergelijken en beluisteren" uit fase 3 nooit gebouwd is.

## Keuzes
- **Audio is WAV.** MP3 vraagt een nieuwe bibliotheek. spessasynth rendert met een `OfflineAudioContext`; proef in de browser op 2 november: *The Irish Blessing* (23 partijen, 60 seconden) kost 5 seconden en geeft 11 MB, ook partij 16 en hoger klinken. Zonder normaliseren loopt de piek op tot 1,67 en vervormt het geluid, dus altijd `normalizeAudio: true`.
- **De mixer telt mee in de audio.** Gedempte partijen gaan er helemaal uit. Tijdens het renderen negeert Chromium berichten aan de synthesizer, dus het volume gaat via MIDI-volume: `100 * wortel(volume / 100)` klinkt even hard als de speler (gemeten: volume 50 wordt 71, een verhouding van 0,501).
- **Het tempo van de audio is dat van de partituur.** De tempo-schuif van de speler is om te oefenen.
- **Inpakken in de server zelf,** met `node:zlib`, brotli kwaliteit 5: Verovio gaat in 0,1 seconde van 7,3 naar 2,1 MB. Elk bestand krijgt een etag en `no-cache`, zodat een nieuwe versie na een update meteen klopt.
- **Opruimen:** na een herkenning zijn alleen de `blad-*.png` nog nodig. De PDF van de gebruiker blijft dus niet staan, wat ook goed is voor fase 5. Een mislukte herkenning laat niets achter. Bij het starten verdwijnen herkenningen van ouder dan 30 dagen die geen bewaard project gebruikt.
- **Vastgelopen pagina: geen 400 dpi, maar een tweede ronde.** De voorraad ging ervan uit dat pagina 2 van *The Irish Blessing* 400 dpi nodig had. De proef laat iets anders zien: de pagina loopt altijd vast op stap HEADERS, ook bij een limiet van 240 seconden, maar een nieuwe ronde op hetzelfde `.omr`-boek (`-transcribe -force -save -sheets 2 -- invoer.omr`) gaat verder vanaf die stap en is in 2,5 minuut klaar. Er wordt dan niet opnieuw geladen, dus de dpi speelt geen rol. Omdat het hetzelfde boek blijft, is samenvoegen niet nodig en werkt de export gewoon.
- **Eerste ronde 120 seconden, tweede ronde 240.** Met 120 seconden loopt dezelfde pagina op dezelfde stap vast en werkt de tweede ronde net zo. Een vastgelopen pagina kost zo 2 minuten minder. Alleen een pagina die begonnen is, niet is afgekeurd en geen PAGE haalde krijgt een tweede ronde; een afgekeurde pagina (bijvoorbeeld een titelblad) niet.
- **Versies vergelijken zonder tweede notatie.** Een versie is een kopie van de partituur met naam en tijd, bewaard in het project. Het scherm laat per partij zien in welke maten het verschilt, kleurt die maten in de notatie, en wisselt in de speler tussen de versies op dezelfde tijd. Twee notaties echt naast elkaar is veel meer werk en voegt weinig toe zolang de verschilmaten gemarkeerd zijn; dat staat in de voorraad.
- **Zekerheid, plek en de naam van een partij tellen niet als verschil:** ze veranderen de muziek niet.

## Pakketten
| Golf | Pakket | Bestanden | Uitvoerder | Issue |
|---|---|---|---|---|
| 1 | Audio-export met knop | `src/midi/hoorbaar.mjs`, `public/js/audio-export.js`, `views/export.js` | Copilot | #140, gemerged |
| 1 | Server pakt in en onthoudt | `server.mjs` | Codex | #141, gemerged (na exacte code) |
| 1 | Herkenningen opruimen | `src/server/opruimen.mjs`, `herken.mjs`, `server.mjs` | Codex | #142, gemerged |
| 2 | Versies: vergelijken en bewaren | `src/model/versies.mjs`, `src/project/opslag.mjs` | Codex | #144, gemerged |
| 2 | Herstelronde voor vastgelopen pagina's | `src/server/audiveris.mjs`, `herken.mjs` | Codex | #148 |
| 3 | Versies: scherm, luisteren, markeren | `views/versies.js`, `speler.js`, `weergave.js`, `projecten.js`, `main.js`, `index.html`, `app.css` | Copilot | #149 |

## Tests
Elke taak bevat de exacte testcode, vooraf gedraaid in een aparte werkmap: `hoorbaar.test.mjs`, `server-inpakken.test.mjs`, `opruimen.test.mjs`, `herken-opruimen.test.mjs`, `versies.test.mjs`, `herken-hervat.test.mjs`. Audio en het scherm kan Node niet testen; die controleert Claude een keer in de browser. Audiveris zelf test Claude met een echte partituur.
