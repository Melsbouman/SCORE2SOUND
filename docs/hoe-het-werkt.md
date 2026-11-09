# Hoe het werkt

## Wie doet wat
- **Claude** maakt taken op basis van het issue, schrijft een plan en controleert de pull-request.
- **Codex** en **Copilot** schrijven de code voor de taken die ze krijgen.
- **Hermes** schrijft de tekst van de taken.
- Een **script** controleert, commit, pusht, opent de PR en past labels toe.

## Wat gebeurt automatisch
- Elke 10 minuten start de lus (hartslag) die stilstaande wachtrijen opzoekt.
- Het script stuurt controles die mislukt zijn terug naar de agent.
- Het script zet een taak die vastloopt over naar de andere uitvoerder en geeft Codex nog één laatste poging.
- Claude maakt automatisch nieuwe taken aan als er minder dan 12 open zijn.

## Wat moet Mels doen
- De laptop aan de lader en wakker houden.
- Het OpenRouter-tegoed op peil houden voor Hermes via https://openrouter.ai/settings/credits.
- De server en het domein regelen zodat de app online is.
- Nieuwe ideeën doorgeven.

## Waar je dingen ziet
- De GitHub-pagina van de repository voor taken en pull requests.
- `automatisering/review.sh` en `automatisering/hartslag.sh`.

## Van pdf tot geluid
1. De server verwerkt de aangeleverde pdf met Audiveris via `app/src/server/audiveris.mjs`.
2. De herkende MusicXML wordt gelezen door `app/src/musicxml/lezen.mjs`.
3. De scanketen en de herstelketen verbeteren de herkenning (zie hieronder).
4. Je bewerkt noten in `app/public/js/views/editor.js`.
5. De browser speelt de muziek af met `app/src/midi/hoorbaar.mjs`.
6. Je exporteert de partituur via `app/public/js/views/export.js`.

## Wat te doen als er niets gebeurt
- 1. Kijk of de laptop wakker is.
- 2. Draai `bash automatisering/hartslag.sh`.
- 3. Kijk of er een taak met het label `agent-stuck` staat.

## De PDF
De server tekent de partituur met Verovio en zet elke pagina in een PDF met pdfkit. Over elke pagina komt het schuine watermerk SCORE2SOUND.

## De vaste speler
|De speler zit als een lage balk onderaan het scherm en blijft zichtbaar bij elk tabblad van het lint. Het tempo, de metronoom, de voorinteller en het herhalen van een passage staan daar.

## Titelblok en kopiëren
|Boven het stuk staat links de partijnaam met de stemming, zoals Flugelhorn 1 in B♭, en rechts de componist met daaronder arr. en de naam van de arrangeur. Je kunt een reeks maten kiezen met Shift-klik of alle maten met Ctrl en A en ze kopiëren en plakken.

## Toetsenbord en schermlezer
Alles in de editor kan met het toetsenbord: tabbladen met Alt en een cijfer van 1 tot en met 6, noten met letters en pijlen, maten met Shift-klik en Ctrl+A, en zoomen met Ctrl en plus, min of nul. De knoppen hebben een zichtbare focusrand en een naam voor schermlezers.

## Voortekens en samengestelde rusten
Een mol, kruis of herstellingsteken wordt getekend als de toonhoogte afwijkt van de toonsoort of van een eerdere noot in dezelfde maat, op dezelfde plek op de balk. Een samengestelde rust (een blok met een cijfer erboven) telt als meerdere maten rust; de herkenning leest dat cijfer niet altijd en kan het aantal afleiden uit de repetitiecijfers.

## De scanketen op de server
Wat er gebeurt tussen het uploaden van een pdf of foto en de partituur in de editor (`app/src/server/herken.mjs`):
1. Audiveris (los programma, `app/src/server/audiveris.mjs`) herkent de bladen in drie rondes en levert MusicXML en de bladen met hun maten (stapels) en plekken.
2. De MusicXML wordt gelezen (`app/src/musicxml/lezen.mjs`), de pagina's worden samengevoegd en elke maat en noot krijgt haar plek op het blad (`koppelOmr` in `app/src/server/omr.mjs`). Een maat die Audiveris in de MusicXML wegliet, wordt een gat in plaats van dat alles erna opschuift.
3. Titel, componist en arrangeur komen uit de kop; een rust vooraan die alleen in de kop staat (zoals 12 maten bij Sand and Stars) komt als beginrust in de partij.
4. De tekstherkenning (Windows op een pc, Tesseract op de server) leest elk blad. Partijen worden gesplitst als de paginakop een andere partijnaam noemt (ruis als Bl» voor B♭ telt niet). Tekst komt bij de maten.
5. Het cijfer boven een rustmaat wordt het aantal maten van een meermaatsrust (uit de tekstherkenning, en bij een digitale pdf uit de tekst in de pdf zelf).
6. De repetitiecijfers en -letters van het blad komen met hun plek bij de maten, vóór het herstel: Audiveris hangt een kader vaak aan de maat ervoor. Een meermaatsrust aan het begin van een regel die Audiveris wegliet (hij voegt de lege plek samen met de maat erna) wordt ingevoegd als het cijfer erboven te lezen is (`app/src/server/verlorenrusten.mjs`); anders komt er een melding.
7. De herstelketen (`app/src/model/herstel.mjs`, zie hieronder) vult onder meer ontbrekende maten aan tussen de repetitiecijfers, of tussen de gedrukte maatnummers aan het begin van de regels als de partij geen genummerde repetitiecijfers heeft.
8. Een gemiste rust (de maat is een notenwaarde te kort en op het blad zit een gat, `app/src/model/rustgaten.mjs`) en een verkeerd gelezen triool (`app/src/model/triolenherstel.mjs`) worden hersteld, rood of oranje, met een melding.
9. Lege maten krijgen een rust, de maatduur wordt gecontroleerd en verdachte noten worden rood.
10. Meldingen om na te kijken: de nootkoppen in een digitale pdf als tweede mening per maat, het gedrukte maatnummer aan het begin van een regel naast de nummering (`app/src/model/gedruktenummers.mjs`), en een meermaatsrust of noten aan het begin van een regel die Audiveris wegliet (`app/src/server/verlorenrusten.mjs`).

De scan opent in de editor als concept, met een balk "Nog nakijken" (onzekere noten en meldingen) en de knop "Klaar met nakijken". Meldingen uit de herkenning blijven na een bewerking staan en schuiven mee als je een maat invoegt of weghaalt; een melding bij een maat verdwijnt als je die maat goedkeurt.

## De herstelketen
1. Herstel de titel door samengevoegde hoofdletterafkortingen na een woord weer aan dat woord te koppelen.
2. Haal een herhaald colofon uit de noten en bewaar bruikbare colofontekst eenmaal bij de partituur.
3. Maak van een sterkte of speelwijze die Audiveris als zangtekst las (ff, marc., cresc.) weer een aanduiding.
4. Verwijder zangtekst uit noten in een partij als minder dan 40% van de niet-overgebonden noten tekst heeft.
5. Haal tempo uit tekstuele tempo-aanduidingen (tussen 20 en 300). De maatsoort blijft zoals Audiveris hem las: een maat die langer of korter is, krijgt een melding (de herkenning verzint geen wisseling van maatsoort).
6. Voeg aan alle partijen beginmaten met rust toe als een genummerde aanwijzing in de eerste acht maten van de eerste partij op ontbrekende beginmaten wijst.
7. Haal een herhaalde sleutel na een samengestelde rust weg.
8. Vul ontbrekende maten aan tussen genummerde aanwijzingen. Repetitiecijfers die maatnummers zijn (oplopend, en een boven de 40) en cijfers in een kader worden nooit het aantal maten van een rust; een cijfer op een meermaatsrust gaat naar de maat erna als het aantal maten alleen zo klopt. Zonder genummerde repetitiecijfers tellen de gedrukte maatnummers aan het begin van een regel, als ze oplopen en het volgende nummer het gat bevestigt. Het tekort komt op een lege maat (leeg in alle partijen), anders op de enige rustmaat in het gat, en anders als rode maten rust vóór het volgende cijfer. Een meermaatsrust krijgt altijd zijn verborgen maten, zodat hij te zien en te horen is.
9. Vul ontbrekende letters in een letterreeks aan.
10. Markeer noten die sterk afwijken van hun buren als verdacht en verlaag hun zekerheid tot maximaal 0,5.

Eerste- en tweede-eindehokjes invullen staat uit: de heuristiek gaf bij Galop hokjes op de verkeerde plek.

## Rood betekent: kijk even na
Een rode noot of maat is iets waar de herkenning of de herstelketen niet zeker van is: een noot die ver van haar buren ligt, of een maat die is ingevuld omdat het repetitiecijfer niet klopte met het aantal maten. Controleer ze en keur ze goed met Enter of met Maat klopt.
