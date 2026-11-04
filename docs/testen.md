# Overzicht van tests voor wie een nieuwe wil schrijven

## Snel beginnen

Voer de opdrachten uit vanuit de map `app`:
- Alle tests: `npm test`
- Eén testbestand: `npm test -- test/duur.test.mjs`

Fixtures in `app/test/fixtures/`:
- `sand-and-stars-begin.xml` – bevat de eerste 30 maten van de ruwe uitvoer van Audiveris voor Sand and Stars.

## Hoe je de tests draait

- Voer de tests uit vanuit de hoofdmap van de repo met `bash hermes/tests.sh`
- Je kunt ook rechtstreeks in `app` draaien met `npm test`

## Indeling in groepen

De tests zijn ingedeeld in de volgende groepen, op basis van functionaliteit:

### Model en rekenwerk
Testen de lage rekenkunde van het muziekmodel: tikken, maten, duur, triolen, secties en andere transformaties.
- `app/test/duur.test.mjs` – `TIKKEN_PER_KWART`, `naarTikken`, `maatLengte`, `notatieDuur`, `triool`, `alsKwarten`
- `app/test/gang.test.mjs` – server API-implementatie (importeren, bewaren, teruglezen, verwijderen)

### MusicXML lezen en schrijven
Testen de parses en generators voor MusicXML-bestanden, inclusief attributen, richtingen, notaties, maten, de partijenlijst en de volledige partituur.
- `app/test/aanwijzingen.test.mjs` – `leesAttributen`, `leesRichting`, `leesNotaties`, `leesMaatstreep`
- `app/test/lezen.test.mjs` – lezen van echte MusicXML-bestanden (voorbeelden)
- `app/test/schrijven.test.mjs` – `naarMusicXML` en validatie van attributes, noten, rusten, aanwijzingen, herhalingen
- `app/test/xml.test.mjs` – `leesXml`, `kind`, `kinderen`, `tekst`, `getal` hulpfuncties
- `app/test/voorslag-lezen.test.mjs`, `app/test/voorslag-schrijven.test.mjs` – grazia's en triool-aanwijzingen

### MIDI
Testen de conversie tussen partituur en MIDI-bestanden, inclusief kop, sporen, noten, tempo, dynamiek, herhalingen en eventuele porten.
- `app/test/midi.test.mjs` – kopformaat, dirigentenspoor, tempo, partijsporen, noten, gelijktijdige aan/uit
- `app/test/midi-poorten.test.mjs`, `app/test/midi-uitvoering.test.mjs`, `app/test/fermate-midi.test.mjs` – specialere MIDI-functionaliteit

### Herkenning en server
Testen het REST API van de herkenningsproces, het statemachine-gedrag, paginakeuze, foutafhandeling, gebruikersgebonden werk en bewaargeheimen na een herstart.
- `app/test/herken.test.mjs` – upload, wachten op statussen, bladafhandeling, paginakeuze, fouten, concurrentie, afbreken
- `app/test/herken-bewaard.test.mjs` – herkenning blijft beschikbaar na serverherstart, toegangscontrole
- `app/test/herken-gebruiker.test.mjs` – herkenning per gebruiker, toegangscontrole
- `app/test/herken-hervat.test.mjs` – herkenning opnieuw starten, de volledige partituur behouden
- `app/test/herken-instrument.test.mjs`, `app/test/herken-paginas.test.mjs`, `app/test/herken-opruimen.test.mjs`, `app/test/herken-paginatelling.test.mjs`, `app/test/herken-uurlimiet.test.mjs` – subfuncties
- `app/test/server.test.mjs` – server levert statische bestanden, bibliotheken, beveiliging
- `app/test/server-inpakken.test.mjs` – bibliotheken hebben geen kale imports meer

### Accounts en beveiliging
Testen registratie, inloggen, sessiebeheer, rate-limiting, verwijderen, opslag van alleen-hashwaarden en toegangscontrole.
- `app/test/accounts.test.mjs` – registreren, inloggen, inloglimiet, sessieverloop, uitloggen, wachtwoordgeheimhouding, verwijderen
- `app/test/accounts-opruimen.test.mjs` – accounts-opschoning
- `app/test/account-verwijderen.test.mjs` – gebruikersbestand verwijderen
- `app/test/inloggen.test.mjs` – inloggen
- `app/test/inloggen-limiet.test.mjs` – 5 mislukte pogingen dwingen tot wachten

### Schermen
Er zijn geen aparte testbestanden voor schermen. Schermlogica wordt getest via de app-tests en de acceptatie-eisen van het script.

## Voorbeelden
Alle tests gebruiken testvoorbeelden uit `app/test/voorbeelden/`:
- `app/test/voorbeelden/` – MusicXML-bestanden (`.musicxml`), Audiveris XML (`.xml`), OMR-bestand (`.omr`), PNG-afbeelding (`.png`)
- `app/test/voorbeelden.test.mjs` – geldigheid van elk MusicXML-voorbeeld en vergelijking van herkenning van XML en MusicXML

## Regels
- Een nieuwe functie krijgt een test. Testen worden geschreven in dezelfde bestandsnaam als de functie (bijvoorbeeld `duur.test.mjs` voor `duur.mjs`).
- Een agent past bestaande tests niet aan zonder dat de taak dat vraagt. Als een test faalt, lossen we het op in de code die wordt getest, niet in de test zelf.
- Echte partituren komen nooit in de repository; alleen de testvoorbeelden uit `app/test/voorbeelden/` worden gebruikt.

## Opmerkingen
- Alle tests zijn geschreven in JavaScript-modules (`.mjs`) met `node:test` en `node:assert/strict`.
- De testvoorbeelden zijn kleine, doelbewuste partituren die de functionaliteit van elk gedeelte van de code uittesten.
- Het script `hermes/tests.sh` voert de volledige testsuite uit en controleert de regels.

## Tests voor de grote editor
Nieuw zijn onder meer eerste-account.test.mjs, speelvolgorde-herhaling.test.mjs, maatduur.test.mjs, titelgegevens.test.mjs, maat-goedkeuren.test.mjs en pdf-watermerk.test.mjs. Draai ze allemaal met npm test in de map app.

## Bestanden die ook in de browser draaien
app/test/browser-import.test.mjs controleert dat bestanden die de browser laadt geen server-only bibliotheek (fast-xml-parser) binnenhalen, ook niet via een ander bestand. Anders tekent de app geen partituur meer.

## Tests voor de Noteflight-editor en de pdf
Nieuw zijn onder meer verschuif-halvetoon, noot-bij-letter, kopieer-maten, aanduidingen, stemming, aanwijzing-toevoegen, haak-toevoegen, aanduiding-plaatsing, dynamiek-als-zangtekst, instrumentnamen-weergave, partijnaam-weergave, pdf-lijnen, pdf-meer-systemen, pdf-titelblok en pdf-zonder-extra-tekst. Draai ze met npm test in de map app.

## Tests voor de herkenning en de bogen
Nieuw zijn herstel-maatsoorten, begin-rust, begin-rust-later, verdachte-noten, ontbrekende-maten, bogen-nummers, midi-volledig en sand-and-stars-fixture. Het testbestand app/test/fixtures/sand-and-stars-begin.xml bevat de eerste 30 maten van de ruwe uitvoer van Audiveris.

## Tests met het echte stuk
roundtrip-fixture controleert dat schrijven en lezen elkaar niet tegenspreken, zangtekst-ruis dat paginatekst als zangtekst wordt weggehaald, en herstel-keten-geldig dat de hele herstelketen schrijfbare partituren geeft.

## Tests voor titel, partijnaam en tempo uit de herkenning
titel-ocr controleert dat SAN D AND STARS weer SAND AND STARS wordt, partijnaam-uit-kop dat Bb Solo Cornet 3, 4 de partijnaam Solo Cornet 3, 4 geeft, en tempo-uit-tekst dat een punt-kwart (J. = 148) wordt omgerekend naar 222 kwarten per minuut.

## Extra tests van de nacht
ontbrekend-nummering controleert dat de maatnummers na de herstelketen strikt oplopen, lege-partij dat schrijfMidi en naarMusicXML een partij zonder noten aankunnen, en speelvolgorde-volta-gewoon dat een volta gevolgd door een gewone maat goed wordt afgespeeld.

## Test van verplaatsNoot
verplaats-noot controleert dat een noot met een rust van dezelfde duur van plaats wisselt, ook naar een andere maat, en dat een andere duur, een doel dat geen rust is en onbekende id's niets veranderen.

## Tests van splitsen en het herstel
splits-rust en splits-noot controleren dat een rust of noot in twee gelijke helften wordt gedeeld en dat een oneven duur niets verandert. herstel-fixture-maten controleert dat het herstel van Sand and Stars 58 maten zonder lege maat geeft en bij een tweede keer hetzelfde oplevert.

## Tests van aanvullen en verplaatsen
vul-maat-aan controleert dat een te korte maat een rust erbij krijgt en een volle maat niet verandert. verplaats-noot-fixture controleert verplaatsNoot op het herstelde Sand and Stars.

## Test van splitsen op het echte stuk
splits-fixture deelt een rust en een noot van het herstelde Sand and Stars en controleert dat de duren samen gelijk blijven en dat de noot een overbinding krijgt.

## Test van aanvullen op het echte stuk
vul-maat-aan-fixture loopt over alle maten van het herstelde Sand and Stars en controleert dat vulMaatAan de invoer niet verandert en een maat nooit korter maakt.
