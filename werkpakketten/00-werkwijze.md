# Werkwijze voor elke agent (lees dit eerst)

Je voert één werkpakket uit voor SCORE2SOUND. De keuzes zijn al gemaakt door Claude en Mels en staan in je taak. **Je kiest niets zelf.** Staat iets niet in je taak, of klopt de taak niet met de code, stop dan en meld het in je rapport. Gok niet.

## Het project
SCORE2SOUND is een web-app in `app/` (Node 24, JavaScript-modules, geen framework). De opbouw staat in `AGENTS.md`, sectie Project; het muziekmodel, het contract tussen alle onderdelen, in `docs/model.md`.

## Harde regels
1. **Werk alleen in de bestanden die je taak als jouw bestanden noemt.** Andere agents werken tegelijk in andere bestanden.
2. **Geen nieuwe dependencies**, tenzij de taak ze precies noemt. Geen sleutels, tokens, wachtwoorden of `.env`-bestanden.
3. **Tests:** pas bestaande tests niet aan en verwijder ze niet, tenzij de taak het vraagt. Faalt een test, dan klopt de code nog niet.
4. **Verwijder geen bestanden**, behalve als je taak dat expliciet zegt.
5. **Stijl:** volg de stijl, de naamgeving en de taal van de code eromheen. Nieuwe teksten en commentaar in het Nederlands, tenzij de taak iets anders zegt.
6. **Regeleinde:** laat het regeleinde aan het einde van elk bestand staan.

## Projectregels
1. **Het model volgen:** tijd in tikken (480 per kwartnoot), genoteerde toonhoogte `{ stap, alter, octaaf }`, meldingen in de vorm uit `docs/model.md`.
2. **Browser en server gescheiden:** code in `app/src/` (behalve `server/` en `musicxml/lezen.mjs`) draait ook in de browser en gebruikt geen Node-modules.
3. **Laat staan:** `app/server.mjs`, `app/public/js/main.js`, `app/public/js/app.js` en de `id`'s van de vlakken in `index.html`, tenzij de taak ze noemt.
4. **Geen inline scripts en geen externe bronnen** in `app/public/`: de app stuurt een strikte Content-Security-Policy mee.
5. **Invoer is niet te vertrouwen:** een geüpload bestand kan kapot of kwaadaardig zijn. Geef dan een nette melding, geen crash, en schrijf nooit buiten de map die de taak noemt.
6. **Een scherm tekent alleen in zijn eigen vlak** (`<section id="...">`) en praat met de rest via `app` uit `js/app.js`.

## Verplichte zelfcontrole (alleen handmatig, zonder runner-script)
Draai vanuit de hoofdmap van de repo en zet de uitkomst in je rapport:
```bash
bash hermes/tests.sh pad1 pad2
node hermes/regels-controle.mjs --basis main --toegestaan "pad1,pad2"
```
Via het runner-script draai je niets: dat doet het script.

## Rapport (je laatste bericht)
- **Gewijzigde bestanden**, per bestand in één zin wat er veranderde.
- **Uitkomst van de controles** (letterlijk, alleen bij handmatig werk).
- **Wat je níet hebt gedaan of waar je twijfelt.** Liever een open vraag dan een gok.
