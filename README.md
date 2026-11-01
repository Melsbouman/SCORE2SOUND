# SCORE2SOUND

SCORE2SOUND helpt muzikanten om van bladmuziek naar hoorbare, bewerkbare muziek te gaan: open een partituur, controleer de noten, luister naar de partijen en oefen met de rest als begeleiding.

## Wat de app nu kan
- **Openen**: sleep een PDF, scan, foto (PNG of JPG) of MusicXML-bestand (`.musicxml`, `.xml`, `.mxl`) naar het uploadvlak, of kies er een. Bij een PDF kun je pagina's kiezen, zoals `1-4 7`. Herkennen duurt 1 tot 2 minuten per volle pagina; je ziet de voortgang en kunt afbreken.
- **Origineel**: na herkenning staat de gescande pagina naast de notatie.
- **Corrigeren**: onzekere noten zijn rood. Klik op een noot of rust om hem te corrigeren, op het origineel te zien en daarna opnieuw te beluisteren.
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

Voor het afspelen is een General MIDI-klankbank nodig in `app/public/klankbank/standaard.sf3` (niet in git, omdat hij groot is). Wij gebruiken MuseScore_General.sf3 (MIT-licentie, ongeveer 40 MB):
```bash
mkdir -p app/public/klankbank
curl -L -o app/public/klankbank/standaard.sf3 https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General.sf3
```
Zonder klankbank werkt alles behalve het geluid, en de speler zegt dat.

## Herkenning met Audiveris
Voor PDF, scans en foto's is [Audiveris](https://github.com/Audiveris/audiveris) 5.11 nodig. De app zoekt hem op `C:\Program Files\Audiveris\Audiveris.exe`; staat hij ergens anders, zet het pad dan in de omgevingsvariabele `AUDIVERIS`. MusicXML openen werkt ook zonder.

Voor partijnamen en titels heeft Audiveris taalbestanden nodig: `eng`, `deu` en `nld` uit [tesseract-ocr/tessdata](https://github.com/tesseract-ocr/tessdata) (niet `tessdata_fast`), in `%APPDATA%\AudiverisLtd\audiveris\config\tessdata`.

Uploads en pagina's staan in `app/herkenning/` (niet in git).

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
