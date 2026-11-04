SCORE2SOUND is een web-app die bladmuziek omzet naar bewerkbare notatie en hoorbare muziek.

Start de app vanuit de map `app/` met `npm start`. De app draait op poort 5175.

Voer de tests vanuit de map `app/` uit met `npm test`.
## Wat het kan
|
- PDF, scan, foto of MusicXML openen en herkennen
| de notatie naast het origineel met dezelfde regelindeling
| onzekere noten rood en verbeteren met knoppen, toetsenbord en slepen
| repetitieletters, tempo per maat, meermaats-rusten, voorslagen en volta's
| afspelen per partij met mixer, tempo, herhalingen en rallentando
| versies bewaren en vergelijken
| partijen bewerken, samenvoegen en transponeren
| exporteren als MusicXML, MIDI, WAV, PDF en zip met alle partijen
| accounts met uitnodigingscode voor online gebruik
|
## Nodig

- Node.js 24 of hoger
- Audiveris voor het herkennen van PDF-bestanden en foto's
- Een General MIDI-klankbank in `app/public/klankbank/standaard.sf3` om muziek af te spelen

## Starten

Voer vanuit de hoofdmap van de repo uit:

```bash
cd app
npm install
npm start
```

Open daarna http://localhost:5175. Je kunt ook vanuit de hoofdmap `bash scripts/start-lokaal.sh` uitvoeren; dat script installeert zo nodig de afhankelijkheden en waarschuwt als Audiveris of de klankbank ontbreekt.

## Testen

```bash
cd app
npm test
```

## Plannen en werkwijze

- De plannen staan in `werkpakketten/plannen/`.
- De werkwijze met agents staat in `hermes/WERKWIJZE.md`.

## Online zetten

De instructies voor online zetten staan in `docs/online.md`.
