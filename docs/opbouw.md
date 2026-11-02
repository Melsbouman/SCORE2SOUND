# Overzicht van de mappen en modules

Dit document beschrijft de structuur van de SCORE2SOUND-codebase in eenvoudige Nederlandse taal, voor wie nieuw is in de code.

## Directories onder app/

### src/model/
- **corrigeren.mjs** corrigeert toonhoogte, duur, alter en andere elementen in het muziekmodel.
- **duur.mjs** berekent de duur van noten en maten in tikken, met ondersteuning voor punten en triolen.
- **instrumenten.mjs** bewaart de instrumentlijst met transpositie, sleutels, MIDI-programma en bereik.
- **maten.mjs** bevat functies voor maatsoortberekening en speelvolgorde met herhalingen.
- **muziektermen.mjs** bewaart een lijst met muzikale termen en een spelfunctie om afkortingen te verbeteren.
- **partijen.mjs** beheert partijen: hernoemen, uitnemen en samenvoegen van partituren.
- **toonhoogte.mjs** converteert tussen tonenhoogte-objecten en MIDI-noten, bewaart transpositie en naam.
- **transponeren.mjs** beheert transpositie van partijen naar instrumenten, met waarschuwingen bij bereikoverschrijding.
- **versies.mjs** vergelijkt twee versies van een partituur en rapporteert verschillen per partij en maat.

### src/musicxml/
- **xml.mjs** helpt om MusicXML-tekst naar XML-bomen te parseren (leesXml, kind, kinderen, tekst, getal).
- **src/musicxml — leest MusicXML-bestanden en schrijft MusicXML-bestanden.** (lezen.mjs)
- **schrijven.mjs** schrijft het model naar MusicXML met juiste notatie voor herhalingen, dynamiek, enzovoort.
- **aanwijzingen.mjs** leest aanwijzingen (crescendo, decrescendo, tempo, tekst, letter, enz.) uit MusicXML.

### src/controle/
- **maatduur.mjs** berekent de duur van maten in tikken (480 tikken per kwartnoot).
- **nabewerken.mjs** voegt herhalingsgegevens toe aan maten.

### src/midi/
- **hoorbaar.mjs** geeft de MIDI-uitvoer weer in de browser.
- **schrijven.mjs** schrijft het model naar MIDI.

### src/project/
- **opslag.mjs** beheert opslaan en laden van projecten, inclusief compressie naar ZIP.

### src/server/
- **accounts.mjs** beheert gebruikersaccounts (aanmaken, verwijderen, wijzigen).
- **audiveris.mjs** converteert een afbeelding naar MusicXML via Audiveris.
- **gebruikersdata.mjs** bewaart sessiegegevens (gebruiker, token, enz.).
- **herken.mjs** herkent partijen in een blad (zoekt naar pianopartijen).
- **importeer.mjs** importeert bladen in een bestaande partituur.
- **inloggen.mjs** beheert het inloggen bij een gebruikersaccount.
- **kaders.mjs** leest tekens (letters en nummers) uit een afbeelding.
- **letters.mjs** zoekt naar repetitieletters in de bladen van een partituur.
- **limiet.mjs** beheert de grootte van de verzending (en beperkt aantal bladen).
- **omr.mjs** converteert een afbeelding naar MusicXML (via Audiveris).
- **opruimen.mjs** verwijdert oude, niet-actieve projecten en bestanden.
- **projecten.mjs** beheert de lijst van projecten (toon, zoek, verwijder).
- **zip.mjs** comprimeert een partituur naar ZIP voor download.

### public/
- **index.html** de HTML-pagina die de app laadt.
- **app.css** de stijlen voor de interface.
- **js/main.js** start het schermbeheer.
- **js/app.js** de gedeelde JavaScript-logica en zustand-opslag.

### test/
- **Voorbeeldbestanden** in test/voorbeelden/ worden gebruikt voor tests.
- **Testbestanden** (.test.mjs) voeren unit- en integratietests uit met node:test.

Verwijs naar docs/model.md voor het model en naar docs/online.md voor online zetten.