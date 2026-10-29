# SCORE2SOUND

SCORE2SOUND helpt muzikanten om van bladmuziek naar hoorbare, bewerkbare muziek te gaan: open een partituur, controleer de noten, luister naar de partijen en oefen met de rest als begeleiding.

## Wat de app nu kan (fase 1)
- **MusicXML openen**: sleep een `.musicxml`- of `.xml`-bestand naar het uploadvlak, of kies er een. PDF, scans en foto's volgen in fase 2.
- **Bekijken**: de partituur verschijnt als notatie, met alle partijen.
- **Controleren**: maten die langer of korter zijn dan hun maatsoort, staan bij Meldingen. Een klik op een melding laat die maat zien.
- **Afspelen**: met tempo van 25 tot 150 procent, en een passage herhalen (van maat, tot en met maat). De maat die klinkt, kleurt mee.
- **Mixer**: per partij het volume, dempen of solo.
- **Bewaren**: de partituur als project bewaren en later weer openen.
- **Exporteren**: als MusicXML of als MIDI.

## Starten
Nodig: Node 24.
```bash
cd app
npm install
npm start
```
Open daarna http://localhost:5175.

Voor het afspelen is een General MIDI-klankbank nodig in `app/public/klankbank/standaard.sf3` (niet in git, omdat hij groot is). Zonder klankbank werkt alles behalve het geluid, en de speler zegt dat.

## Testen
```bash
cd app
npm test
```

## Hoe er gebouwd wordt
Deze repo werkt met agents: Mels geeft ideeën, Claude maakt er plannen en kleine taken van, Codex en Copilot bouwen, Hermes doet kleine achtergrondtaken, en een script controleert alles ertussen.
- Het plan voor de app: `werkpakketten/plannen/2026-10-29-score2sound-app.md`
- Het muziekmodel: `docs/model.md`
- Opzet en keuzes van de werkwijze: `hermes/ARCHITECTUUR.md`
- Werkwijze per stap: `hermes/WERKWIJZE.md`
- Afspraken voor Claude en voor agents: `CLAUDE.md` en `AGENTS.md`
