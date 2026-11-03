# Overzicht van de mappen en modules

Dit document beschrijft de structuur van de SCORE2SOUND-codebase in eenvoudige Nederlandse taal, voor wie nieuw is in de code.

## Directories onder app/

### src/model/
- **corrigeren.mjs** corrigeert toonhoogte, duur, alter en andere elementen in het muziekmodel.
- **duur.mjs** berekent de duur van noten en maten in tikken, met ondersteuning voor punten en triolen.
- **geschiedenis.mjs** bewaart wijzigingen en ondersteunt ongedaan maken en opnieuw uitvoeren.
- **instrumenten.mjs** bewaart de instrumentlijst met transpositie, sleutels, MIDI-programma en bereik.
- **maten.mjs** bevat functies voor maatsoortberekening en speelvolgorde met herhalingen.
- **muziektermen.mjs** bewaart een lijst met muzikale termen en een spelfunctie om afkortingen te verbeteren.
- **noten-bewerken.mjs** wijzigt noten, rusten, articulaties, fermates en overbindingen.
- **partijen.mjs** beheert partijen: hernoemen, uitnemen en samenvoegen van partituren.
- **partituurvolgorde.mjs** sorteert partijen in de volgorde van hun instrumenten.
- **tekstsoort.mjs** herkent het soort muzikale tekst en bepaalt de plaatsing ervan.
- **tempo.mjs** leest en wijzigt tempoaanduidingen per maat.
- **tempoverloop.mjs** bepaalt over welke maten tempoaanduidingen doorwerken.
- **titelgegevens.mjs** wijzigt titel, componist en arrangeur van een partituur.
- **toonhoogte.mjs** converteert tussen tonenhoogte-objecten en MIDI-noten, bewaart transpositie en naam.
- **transponeren.mjs** beheert transpositie van partijen naar instrumenten, met waarschuwingen bij bereikoverschrijding.
- **versies.mjs** vergelijkt twee versies van een partituur en rapporteert verschillen per partij en maat.
- **zipschrijven.mjs** maakt een ZIP-bestand van bestanden, bijvoorbeeld partituren.

### src/musicxml/
- **xml.mjs** helpt om MusicXML-tekst naar XML-bomen te parseren (leesXml, kind, kinderen, tekst, getal).
- **src/musicxml — leest MusicXML-bestanden en schrijft MusicXML-bestanden.** (lezen.mjs)
- **schrijven.mjs** schrijft het model naar MusicXML met juiste notatie voor herhalingen, dynamiek, enzovoort.
- **aanwijzingen.mjs** leest aanwijzingen (crescendo, decrescendo, tempo, tekst, letter, enz.) uit MusicXML.

### src/controle/
- **indeling.mjs** controleert of de systeemindeling overeenkomt met de partituur.
- **maatduur.mjs** berekent de duur van maten in tikken (480 tikken per kwartnoot).
- **nabewerken.mjs** voegt herhalingsgegevens toe aan maten.
- **nauwkeurigheid.mjs** vergelijkt herkende noten en maten met de juiste partituur.

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
- **kwota.mjs** berekent hoeveel opslagruimte bestanden gebruiken en toetst de limiet.
- **letters.mjs** zoekt naar repetitieletters in de bladen van een partituur.
- **limiet.mjs** beheert de grootte van de verzending (en beperkt aantal bladen).
- **omr.mjs** converteert een afbeelding naar MusicXML (via Audiveris).
- **opruimen.mjs** verwijdert oude, niet-actieve projecten en bestanden.
- **pdfpaginas.mjs** telt de pagina's in een PDF-bestand.
- **projecten.mjs** beheert de lijst van projecten (toon, zoek, verwijder).
- **samenvoegen.mjs** voegt gesplitste partijen samen als ze bij elkaar horen.
- **zip.mjs** comprimeert een partituur naar ZIP voor download.

### public/js/views/
- **bewerken.js** beheert het aanpassen, sorteren en samenvoegen van partijen.
- **corrigeren.js** laat je onzekere noten en rusten controleren en corrigeren.
- **editor.js** biedt knoppen en sneltoetsen om noten te bewerken en wijzigingen ongedaan te maken.
- **export.js** exporteert de partituur en partijen als MusicXML, MIDI, ZIP, PDF of audio.
- **inloggen.js** regelt inloggen, registreren, uitloggen en account verwijderen.
- **lint.js** groepeert de schermonderdelen in tabbladen.
- **meldingen.js** toont meldingen en laat je naar de bijbehorende maat gaan.
- **mixer.js** regelt het volume, dempen en solo van partijen.
- **onzeker.js** helpt onzekere noten één voor één of in één keer goed te keuren.
- **origineel.js** toont de bronpagina's en markeert de plek van een noot.
- **projecten.js** bewaart, opent en verwijdert projecten.
- **slepen.js** laat je noten in de partituur verslepen om ze te verplaatsen.
- **sneltoetsen.js** toont de beschikbare sneltoetsen.
- **tempo.js** laat je tempo's per maat toevoegen, wijzigen en verwijderen.
- **titel.js** beheert titel, componist en arrangeur.
- **versies.js** bewaart en vergelijkt versies en laat je een versie terugzetten.

### public/
- **index.html** de HTML-pagina die de app laadt.
- **app.css** de stijlen voor de interface.
- **js/main.js** start het schermbeheer.
- **js/app.js** de gedeelde JavaScript-logica en zustand-opslag.

### test/
- **Voorbeeldbestanden** in test/voorbeelden/ worden gebruikt voor tests.
- **Testbestanden** (.test.mjs) voeren unit- en integratietests uit met node:test.

Verwijs naar docs/model.md voor het model en naar docs/online.md voor online zetten.

## PDF met watermerk
app/src/export/pdf.mjs maakt de PDF uit MusicXML (Verovio, pdfkit en svg-to-pdfkit) en de route /api/pdf in app/src/server/pdf.mjs levert hem. De knop PDF downloaden gebruikt die route.