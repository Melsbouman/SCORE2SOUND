# SCORE2SOUND

SCORE2SOUND zet bladmuziek om in bewerkbare notatie en hoorbare muziek. Je kunt de noten controleren en corrigeren, partijen beluisteren en je muziek bewaren of exporteren.

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
