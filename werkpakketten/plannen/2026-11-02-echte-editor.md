# Een echte editor: noten slepen en een annotatiebalk

Stand: 2 november 2026, op verzoek van Mels. Mels koos: slepen werkt meteen (2 november). Golf 1 staat klaar (#389, #390); golf 2 en 3 volgen na het mergen van golf 1. Noten toevoegen op een lege plek staat in de voorraad.

## Idee
Nu corrigeer je een noot in een zijpaneel (`views/corrigeren.js`) met knoppen en een keuzelijst, en alleen als je eerst een noot kiest. Mels wil dat het een echte editor voelt: een noot die niet klopt (de rode) pak je gewoon vast en sleep je naar de goede hoogte, en een **annotatiebalk** met een icoontje per bewerking (mol, kruis, herstellingsteken, duur, rust, verwijderen) staat altijd binnen handbereik boven de notatie.

## Wat er al is
`app/src/model/corrigeren.mjs` kan al: `verschuif` (stappen omhoog of omlaag), `zetAlter` (mol, kruis, enzovoort), `zetDuur`, `maakRust`, `maakNoot`, `keurGoed`. Verovio geeft elke noot een id (`n-<partij>-<maat>-<element>`) en `weergave.js` meldt een klik als `kies-noot`. De nieuwe editor bouwt daarop; het model verandert niet.

## Keuzes
- **Slepen is verticaal:** een noot slepen verandert alleen de toonhoogte. Elke halve lijnafstand van de notenbalk is een stap (`verschuif`). Tijdens het slepen beweegt een spookje mee, bij loslaten volgt de aanpassing. Horizontaal verplaatsen (andere plek in de maat) valt buiten dit plan: het raakt de maatduur en komt later.
- **Annotatiebalk** boven de notatie, altijd zichtbaar (vast bovenaan bij scrollen), met groepen:
  - voorteken: ♭♭, ♭, ♮, ♯, 𝄪 (de actieve staat is gemarkeerd);
  - duur: hele tot zestiende, plus punt;
  - noot ↔ rust, noot verwijderen (wordt rust), akkoordnoot toevoegen;
  - ongedaan maken en opnieuw;
  - "Klopt" (zekerheid op 1) en "volgende onzekere".
  Op een telefoon scrolt de balk zijwaarts; de knoppen zijn minstens 44 px.
- **Ongedaan maken en opnieuw** (Ctrl+Z, Ctrl+Y), want slepen ging anders te snel mis. De stappen staan in het geheugen van de pagina, niet in het project.
- **Het zijpaneel Noot corrigeren verdwijnt niet:** de balk doet hetzelfde met pictogrammen. Het paneel blijft voor de omschrijving ("Bgl. 1, maat 12: C 5 (onzeker)"). Dubbel werk voorkomen we door beide dezelfde modelfuncties te laten gebruiken.
- **Toetsenbord:** pijl omhoog/omlaag blijft; nieuw zijn `#` en `b` (voorteken), `0` (herstellingsteken), `r` (rust), `Delete` (rust maken).
- **Buiten dit plan:** noten tussenvoegen op een lege plek, maten toevoegen of verwijderen, versieringen en articulaties aanklikken. Dat staat in de voorraad.

## Pakketten
| Golf | Pakket | Bestanden | Uitvoerder | Hangt af van | Issue |
|---|---|---|---|---|---|
| 1 | Model: `zetToonhoogte(partituur, id, toonhoogte)`, `voegAkkoordnootToe(partituur, id)`; `zetAlter` accepteert ook 0 als herstellingsteken en laat de zekerheid op 1 | `src/model/corrigeren.mjs`, `docs/model.md` | Codex | | #389 |
| 1 | Geschiedenis: pure module met `maakGeschiedenis(maxStappen)`, `zet(stand)`, `ongedaan()`, `opnieuw()`; in `app.js` gekoppeld aan `app.zet({ partituur })` | `src/model/geschiedenis.mjs`, `public/js/app.js` | Codex | | #390 |
| 2 | Annotatiebalk: knoppen met inline SVG-pictogrammen, actieve staat, vast bovenaan, bereikbaar met toetsenbord en met `aria-label`; gebruikt de modelfuncties | `public/js/views/annotatiebalk.js`, `public/index.html`, `public/app.css`, `public/js/main.js` | Copilot | model, geschiedenis | |
| 2 | Slepen: noot vastpakken in de notatie, spookje, stappen berekenen uit de afstand tussen notenbalklijnen in de SVG, melden als `sleep-noot` `{ id, stappen }` | `public/js/weergave.js`, `public/js/views/sleep.js` | Copilot | model | |
| 3 | Sneltoetsen (`#`, `b`, `0`, `r`, `Delete`, Ctrl+Z/Y) en de lijst in het hulpscherm | `public/js/views/sneltoetsen.js`, `corrigeren.js` | Hermes of Codex | balk | |
| 3 | Uitleg in `docs/` en de startpagina-tekst ("sleep een noot of gebruik de balk") | `docs/editor.md`, `public/index.html` | Hermes | alles | |

Golf 2 heeft twee Copilot-pakketten die niet dezelfde bestanden raken (`weergave.js` alleen bij slepen, `main.js` alleen bij de balk). Raakt het script ze toch, dan wachten ze op elkaar.

## Tests
Tests schrijven we vóór de code, in de taak, met de exacte testcode.
- `corrigeren-editor.test.mjs` (golf 1): `zetToonhoogte` verandert alleen de gekozen noot en zet de zekerheid op 1; `voegAkkoordnootToe` maakt een tweede noot op dezelfde `start` met `akkoord: true`, en de maat blijft even lang; `zetAlter(…, 0)` geeft een herstellingsteken; een ongeldig id verandert niets.
- `geschiedenis.test.mjs` (golf 1): ongedaan en opnieuw in de goede volgorde; een nieuwe wijziging na ongedaan maken wist de opnieuw-stappen; maximaal N stappen.
- Het slepen en de balk zijn interface: daarvoor een `--controle` met JavaScript-syntax, en Claude kijkt één keer in de browser (1366 en 375 px) met een echte herkende partij, bijvoorbeeld *A Time for Peace*.

## Open vragen voor Mels
1. Moet slepen ook los van een gekozen noot werken (pak en sleep meteen), of eerst aanklikken en dan slepen? Mijn voorstel: meteen slepen; een klik kiest gewoon.
2. Wil je ook dat je een noot **toevoegt** door op een lege plek van de balk te klikken? Dat is een groter pakket (de plek bepaalt `start`), mijn voorstel is het naar de voorraad te zetten.
