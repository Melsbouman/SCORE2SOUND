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
- `hermes/review.sh` en `hermes/hartslag.sh`.

## Wat te doen als er niets gebeurt
- 1. Kijk of de laptop wakker is.
- 2. Draai `bash hermes/hartslag.sh`.
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
