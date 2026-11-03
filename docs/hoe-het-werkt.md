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
