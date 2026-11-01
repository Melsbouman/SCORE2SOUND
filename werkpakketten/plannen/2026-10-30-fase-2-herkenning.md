# Plan: fase 2, herkenning van PDF, scan en foto

Stand: af op 1 november 2026, zie `werkpakketten/nacht/rapport-2026-11-01.md`. Pakket 29, 27 en de speler heeft Claude zelf gedaan. Hoort bij `werkpakketten/plannen/2026-10-29-score2sound-app.md`.

## Idee
Je uploadt een PDF, scan of foto. De server laat Audiveris de noten herkennen en de partituur staat daarna in de app, net als een geopend MusicXML-bestand. Je ziet het origineel naast de digitale versie, onzekere noten springen eruit, en je corrigeert ze en luistert meteen opnieuw.

## Wat de proef liet zien
Getest op 30 oktober met Audiveris 5.11 en twee eigen partituren van Mels (alleen lokaal, niets in de repo).

- **Het werkt op een echte scan.** *The Irish Blessing* (fanfare, 23 notenbalken per pagina, met potloodstrepen): drie pagina's gaven 30 maten en 952 noten, die de eigen lezer zonder aanpassing inleest. Een eigen voorbeeld van 4 maten kwam noot voor noot goed terug. Tijd: 30 seconden voor een klein blad, 1 tot 2 minuten per volle pagina.
- **Zekerheid per noot staat niet in de MusicXML maar wel in de `.omr`.** Elke notenkop heeft daar een `ctx-grade`, een notenbalk, een lijnpositie en een plek op de pagina. Een proefkoppeling vond 952 van de 952 noten terug, per maat, notenbalk en lijnpositie. 107 noten (11%) zitten onder 0,8.
- **Eén slechte pagina blokkeert de hele export.** Pagina 2 bleef hangen in de stap HEADERS en de titelpagina heeft geen notenbalken; dan schrijft Audiveris geen MusicXML. Oplossing, getest: eerst `-transcribe -save`, dan in een tweede ronde `-export -sheets <goede pagina's> -- invoer.omr` (8 seconden). In `book.xml` staat per pagina welke stappen klaar zijn.
- **Tijdslimiet:** standaard stopt Audiveris een stap na 120 seconden, en een drukke pagina haalde dat niet altijd. Een limiet van 900 seconden duurde bij de hangende pagina 24 minuten. Dus `org.audiveris.omr.Main.sheetStepTimeOut=240`.
- **Geen tekstherkenning:** Audiveris heeft geen taalbestand (`No installed OCR languages`). Partijen heten daardoor `Voice` en titel en tempoteksten ontbreken. De noten komen wel goed door.
- **Stemming ontbreekt:** Audiveris weet niet dat een bugel in Bes staat. Met partijnamen kan de app dat zelf afleiden.
- **Grenzen:** een te klein beeld wordt geweigerd ("too low interline", "try 300 DPI"). Bij *Perihelion* (93 pagina's) staan pagina's ondersteboven; daar kun je pagina's kiezen, maar rechtzetten valt buiten dit plan.

## Keuzes
Besloten door Claude, op grond van de proef:
- **Twee rondes:** eerst `Audiveris.exe -batch -transcribe -save -constant org.audiveris.omr.Main.sheetStepTimeOut=240 -output <map> [-sheets ...] -- <bestand>`, dan `Audiveris.exe -batch -export -sheets <goede pagina's> -constant org.audiveris.omr.sheet.BookManager.useCompression=false -output <map> -- <map>/invoer.omr`. De uitvoer is dan gewone `.xml`, die de bestaande lezer al kan lezen. Pagina's die niet lukten, meldt de app als waarschuwing. Het pad staat in `AUDIVERIS`, standaard `C:\Program Files\Audiveris\Audiveris.exe`.
- **Zekerheid uit de `.omr`:** de app pakt de `.omr` uit en koppelt elke notenkop aan een noot, per maat, notenbalk en lijnpositie. `zekerheid` wordt de `ctx-grade` van de kop. Wat niet te koppelen is, krijgt 0,5, zodat het als onzeker verschijnt. Rusten krijgen de `ctx-grade` van hun rust als die te vinden is, anders 1.
- **Het origineel komt ook uit de `.omr`:** daarin staat per pagina `BINARY.png`, de zwart-witafbeelding die Audiveris gelezen heeft. Zo is er geen PDF-bibliotheek nodig. De coördinaten van de noten horen bij die afbeelding, dus de app kan een noot op het origineel aanwijzen.
- **Zip zelf lezen:** een kleine lezer met het ingebouwde `node:zlib`, geen nieuwe bibliotheek. Daarmee kan de app meteen ook `.mxl` openen (staat in de voorraad).
- **Herkennen is een klus op de achtergrond:** upload geeft meteen een nummer terug, de browser vraagt elke seconde de stand op. Audiveris schrijft per pagina de stappen in zijn uitvoer; daaruit komt de voortgang ("Pagina 3 van 6, noten zoeken"). Er draait één herkenning tegelijk, de rest wacht. Je kunt afbreken.
- **Pagina's kiezen:** bij een PDF kun je aangeven welke pagina's (`1-4 7`). Een partituur van 93 pagina's duurt anders meer dan een uur.
- **Uploadgrens** van 25 naar 100 MB, want een echte scan is groot (*The Irish Blessing* is 54 MB).
- **Bewaren:** de herkenning staat in `app/herkenning/<id>/` (niet in git). De partituur krijgt `bron` en de noten `plek` (uitbreiding van `docs/model.md`), zodat een bewaard project het origineel terugvindt. Opruimen komt in fase 5.
- **Onzekere noten:** de app schrijft voor de weergave een `id` op elke noot en rust en een `color` op onzekere noten; Verovio neemt beide over (getest). Exports blijven zonder kleur.
- **Corrigeren:** klik op een noot of rust in de notatie. Je krijgt een klein paneel: omhoog of omlaag, voorteken, duur, noot wordt rust en andersom, "Klopt". Plus "Volgende onzekere noot". Na elke wijziging tekent de app opnieuw, controleert de maatduur en kun je meteen afspelen; de speler laadt een gewijzigde partituur al zelf opnieuw.
- **Testvoorbeelden:** Claude maakt een klein eigen voorbeeld met een echte Audiveris-uitkomst uit `app/test/voorbeelden/`. Partituren van anderen komen niet in de repo. Tests hebben Audiveris niet nodig: ze werken met dat voorbeeld en een nepprogramma, want de GitHub Action heeft geen Audiveris. Eén extra test draait alleen als Audiveris er is.
- **Fouten in gewone taal:** geen Audiveris gevonden, geen notenbalken gevonden, afbeelding te klein ("scan op 300 dpi"), afgebroken.

Valt erbuiten (naar de voorraad als het later moet):
- ontbrekende maten, sleutels, toonsoorten of maatsoorten corrigeren; we corrigeren noten en rusten;
- omgekeerde of scheve foto's zelf rechtzetten;
- herkenning verbeteren met een eigen model;
- oude herkenningen automatisch opruimen (fase 5).

## Pakketten
Tests gaan voor de code: Claude schrijft ze in golf 0 of zet ze letterlijk in de taak. Per golf raken pakketten elkaars bestanden niet.

| Nr | Titel | Bestanden | Uitvoerder | Hangt af van | Golf |
|---|---|---|---|---|---|
| 20 | Skelet: API-pad, uploadgrens, lege modules, secties, `.gitignore`, model, voorbeeld en tests | `app/server.mjs`, `app/src/musicxml/xml.mjs`, `app/public/index.html`, `app/public/js/main.js`, `.gitignore`, `docs/model.md`, `app/test/voorbeelden/`, lege modules van 21 tot 32 | Claude | | 0 |
| 21 | Zip lezen | `app/src/server/zip.mjs` | Codex | 20 | 1 |
| 22 | Audiveris starten en voortgang lezen | `app/src/server/audiveris.mjs` | Codex | 20 | 1 |
| 23 | Corrigeren: functies op het model | `app/src/model/corrigeren.mjs` | Codex | 20 | 1 |
| 24 | MusicXML: `id` en kleur voor de weergave | `app/src/musicxml/schrijven.mjs` | Copilot | 20 | 1 |
| 25 | Instrument herkennen aan de partijnaam | `app/src/model/instrumenten.mjs` | Copilot | 20 | 1 |
| 26 | Uitleg in de woordenlijst | `docs/woordenlijst.md` | Hermes | 20 | 1 |
| 27 | Zekerheid en plek koppelen uit de `.omr` | `app/src/server/omr.mjs` | Codex | 21 | 2 |
| 28 | `.mxl` openen | `app/src/server/importeer.mjs` | Codex | 21 | 2 |
| 29 | API: herkenning starten, stand, pagina's, afbreken | `app/src/server/herken.mjs` | Codex | 22, 25, 27 | 3 |
| 30 | Uploaden met voortgang, pagina's kiezen, afbreken | `app/public/js/upload.js` | Copilot | 29 | 4 |
| 31 | Origineel naast de notatie | `app/public/js/views/origineel.js`, `app/public/app.css` | Copilot | 29 | 4 |
| 32 | Klik op een noot, onzekere noten kleuren | `app/public/js/weergave.js` | Copilot | 24 | 4 |
| 33 | Correctiepaneel | `app/public/js/views/corrigeren.js` | Copilot | 23, 32 | 5 |
| 34 | Eindcontrole met echte partituren, uitleg, plan en voorraad bijwerken | `README.md`, `werkpakketten/` | Claude | alles | 6 |

## Tests
| Test | Wat | Voor pakket |
|---|---|---|
| `app/test/zip.test.mjs` | opgeslagen en gecomprimeerde bestanden, kapot bestand, namen met `#` | 21 |
| `app/test/audiveris.test.mjs` | de juiste argumenten, voortgang uit logregels, afbreken, Audiveris ontbreekt, exitcode 1 | 22 |
| `app/test/corrigeren.test.mjs` | noot verschuiven, voorteken, duur, noot naar rust en terug, "Klopt", volgende onzekere noot, origineel model blijft ongewijzigd | 23 |
| `app/test/schrijven.test.mjs` (erbij) | met weergave-optie `id` en `color`, zonder optie precies als nu | 24 |
| `app/test/instrumenten.test.mjs` | Bugel, Flügelhorn, Horn Eb, Bass Bb, onbekende naam | 25 |
| `app/test/omr.test.mjs` | alle noten van het voorbeeld gekoppeld, zekerheid en plek kloppen, sleutels, akkoorden, niet te koppelen geeft 0,5 | 27 |
| `app/test/importeer.test.mjs` (erbij) | een `.mxl` opent, een zip zonder MusicXML geeft een nette fout | 28 |
| `app/test/herken.test.mjs` | starten, wachtrij van één, stand, klaar met partituur, pagina ophalen, afbreken, geen paden buiten de map; met nepprogramma | 29 |
| `app/test/audiveris-echt.test.mjs` | alleen als Audiveris er is: het voorbeeld wordt echt herkend | 29 |

De interface (pakketten 30 tot en met 33) controleert Claude in de browser op 1366 en 375 px breed.

## Klaar als
Een PDF uploaden geeft met voortgang een partituur in de app, met het origineel ernaast. Onzekere noten vallen op, je kunt ze corrigeren en opnieuw beluisteren, en na bewaren en opnieuw openen is dat er allemaal nog. Alle tests slagen en alles staat op `main`.

## Open vragen voor Mels
Niets hiervan houdt de bouw tegen.
1. **Tekstherkenning aanzetten:** `eng.traineddata` (ongeveer 4 tot 23 MB, uit `tesseract-ocr/tessdata_fast` of `tessdata` op GitHub) in de tessdata-map van Audiveris geeft partijnamen, titels en tempoteksten, en daarmee de juiste stemming per partij. Dat vraagt een download, dus eerst een ja van Mels. Zonder dit werkt alles, maar heten partijen `Voice`.
