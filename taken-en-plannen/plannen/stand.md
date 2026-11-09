# Stand (bijgewerkt 9 nov 2026, avond)

## Eerste handelingen in elke chat
- `bash automatisering/hartslag.sh` en `bash automatisering/review.sh`.
- Controleer dat er hooguit één `werkpakketten.sh` draait (PowerShell: `Get-CimInstance Win32_Process -Filter "Name='bash.exe'" | ? CommandLine -match 'werkpakketten'`). Start voor een losse taak: `bash automatisering/werkpakketten.sh` (één wachtrij).
- Richting (sinds 9 nov): alles in de browser, zonder server: eigen herkenning naar het voorbeeld van Audiveris, inloggen met Google (`plannen/2026-11-09-browser-herkenning.md`). Audiveris blijft alleen meetlat op de pc van Mels. Daarvoor: werkende scanner met verbeteren in de editor (`plannen/2026-11-08-scanner.md`). Laatste nachtrapport: `nacht/rapport-2026-11-08.md`. Wensen en open punten: `voorraad.md`.

## Stand van het plan "alles in de browser" (9 nov, avond)
Zie `plannen/2026-11-09-browser-herkenning.md` (kolom Stand). Kort:
- Klaar en gemerged: MusicXML openen en projecten bewaren in de browser (A1, A2); pdf-lezer en beelden uit gescande pdf's met eigen CCITT-decoder (B1, B2); herkenning: zwart-wit, schaal, notenbalken, maatstrepen en maten, lijnen weghalen en vormen (C1-C4), nootkoppen met sjablonen uit Bravura, de duur van noten en rusten (C5 deel 1-3); svg-naar-pdf-omzetter en pdf-export in de browser (A3).
- 9 nov avond: balkkop (HEADERS: sleutel, voortekening, maatsoort; `app/src/herkenning/kop.mjs`) en voortekens bij noten (`voortekens.mjs`), plus drie reparaties: lijnen weghalen tot het begin van de balk (een te laat gevolgde lijn maakte de sleutel vast aan de noten), geen meermaatsrust meer op waardestrepen tussen ver uit elkaar staande stokken, en de stap rusten slaat balkkop en voortekens over. Volgorde in de keten: balkkop, koppen, duren, voortekens, rusten.
- Meetscripts staan nu in het repo: `automatisering/herkenning-meting/` (pagina's tekenen met PyMuPDF, referentie uit de MXL, meting Devils Galop, balkkoppen per stuk). Uitleg bovenaan elk script.
- Meting Devils Galop (200 dpi, `automatisering/herkenning-meting/devils-galop.mjs`): balkkoppen 17/17, koppen 250/250, voortekens 64/64 (ook de 3 tussen haakjes en de mollen in akkoorden), niets te veel; duur 224 van 226 (zonder de 24 triolen); rusten zonder de twee valse van eerst. De referentie-MXL heeft vóór maat 41 twee mollen voortekening die niet op het blad staan; het script corrigeert dat.
- Balkkoppen op de eerste bladzijde van de andere stukken: Galop, Distant Land, Renaissance en Sand and Stars alle 42 goed (ook 2/4, 9/8, 6/8, 3/4, 1 tot 3 mollen, 1 tot 2 kruisen); Suite Gothique (vage scan) 9 van 11, de andere 2 gemist en niet verkeerd. Op African Symphony waren de notenbalklijnen lichtgrijs (170) en legde Otsu de drempel op 151; met de papierdrempel (#1848) zijn alle 6 balkkoppen goed. Voortekens op de Galop-scan: alles wat gevonden is klopt; gemist worden kruizen die een hulplijn of boog raken (komt met hulplijnen weghalen, LEDGERS).
- Gemerged op 9 nov avond door de Claude-uitvoerder (elk in ongeveer een minuut): #1848 drempel voor lichtgrijze notenbalklijnen (`papierDrempel` in `beeld.mjs`, terugval in `pijplijn.mjs`; African Symphony nu 6 van 6 balken met sleutel, voortekening en 4/4), #1849 aantal maten boven een meermaatsrust (`cijfers.mjs`; Devils Galop alle 13 goed), #1850 hulplijnen weghalen (`hulplijnen.mjs`, nog niet aangesloten in de keten). Daarna: cijfers van de maatsoort strenger (geen noemer 1; bij twijfel liever geen maatsoort dan een verkeerde).
- Opbouw tot het model (C6, 9 nov avond): `app/src/herkenning/opbouw.mjs` maakt uit de herkende onderdelen een Partituur (maten met `vak`, sleutel/toonsoort/maatsoort in elke maat, toonhoogte met voortekening en voortekens per maat, akkoorden, rusten, meermaatsrust met aantal als `maatrust`, `balk` voor noten onder één waardestreep). Meting `automatisering/herkenning-meting/opbouw-devils-galop.mjs`: Devils Galop direct 102 maten, 94 helemaal goed (de 8 andere zijn triolen); na de herstelketen (herstelHerkenning, vulRustGaten, herstelTriolen) alle 102 goed: toonhoogte 250/250, duur 226/226, triolen 24/24, rusten 124/124, 0 maatduur-meldingen. Daarbij in `duren.mjs`: stok één kolom verder zoeken, waardestrepen tellen stopt vóór de eigen kop, vlaggen tellen begint iets voorbij het eind van de stok (op de andere stukken ongeveer 40 duren beter, één achtste met vlag in Renaissance slechter); `voortekens.mjs`: het kader van een voorteken tussen haakjes neemt de haakjes mee (geen valse rust meer); de meting haalt hulplijnen weg vóór de voortekens (Galop-scan: 2 kruizen meer).
- Daarna (9 nov avond): herhaaltekens (#1860, `strepen[].herhaling` in `maten.mjs`) gaan in de opbouw mee als `herhaling.begin` en `herhaling.eind` (Devils Galop: begin maat 3, eind maat 26). Taak #1863 (het cijfer bij een groep onder één waardestreep, `groepcijfers.mjs`) staat in de wachtrij; daarna in de opbouw aansluiten als `tuplet`. De gedrukte maatnummers aan het begin van een regel (als ankers): een proefversie las er op Devils Galop 14 van 16 goed, maar herkent een kader nog niet; nog geen taak.
- Triolen (9 nov avond): #1863 (`groepcijfers.mjs`, het cijfer bij een groep onder één waardestreep) gemerged; daarna slaat het grote tekens over (tekst als "Optional" boven een groep) en zet de opbouw de groepjes als `tuplet` met de juiste duur. Devils Galop is nu al vóór de herstelketen 102/102 goed. Op de eerste bladzijde van de andere stukken geeft de opbouw nog veel maatduur-meldingen na de herstelketen: Galop 53 van 106 maten, Renaissance 44 van 84, Sand and Stars 24 van 68, Distant Land 24 van 94 (`automatisering/herkenning-meting/`, geen referentie: per maat nakijken waar het misgaat).
- Keten in de browser (C8, 9 nov avond): een pdf-scan of foto wordt nu in de browser herkend, in een Web Worker (`app/public/js/herken-worker.js`, `app/src/herkenning/keten.mjs`, `bladen.mjs`), met voortgang per bladzijde en de herstelketen erachter, en gaat als concept de editor in. Meerdere beelden op een bladzijde (stroken, lagen) worden op hun plek samengevoegd. Een digitale pdf (zonder gescand beeld, zoals Devils Galop) kan de browser nog niet lezen: dan gaat het vanzelf via de server (Audiveris). Wie altijd de server wil: in de browseropslag `score2sound-herkenning` = `server`. In de browser nagekeken: Galop in ongeveer 1 s (100 maten, 221 noten), Renaissance (3 JPEG-bladzijden) in ongeveer 8 s.
- Rusten op scans (9 nov avond): een vlag van een losse achtste die los van zijn stok raakte, telde als achtste rust; een achtste rust in twee stukken als 32e rust; tremolostreepjes onder een hele noot als kwartrust. Nu: geen rust vlak rechts naast het eind van een stok als het op een vlag lijkt (zoekRusten krijgt `noten` met hun stok), stukjes die elkaar raken samen vergelijken, en geen rust recht boven of onder een nootkop. Maatduur-meldingen na de herstelketen (eerste bladzijden, `maatduur` per stuk): Galop 54 naar 10, Distant Land 51 naar 48, Renaissance 118 naar 116, Sand and Stars 53, Devils Galop 0 (102/102 goed).
- Maatsoortwissel midden in de regel (9 nov avond): `kop.mjs` leest ook na een maatstreep een maatsoort (`wissels` per balk, met strengere cijfers: een hele noot met tremolo lijkt anders op 2/2), koppen en rusten slaan die cijfers over, en de opbouw zet de nieuwe maatsoort vanaf die maat. Maatduur-meldingen (`automatisering/herkenning-meting/maatduur.mjs`): Renaissance 116 naar 87, Sand and Stars 53 naar 41; Galop 9, Distant Land 48, Suite Gothique 141, Devils Galop 0 (102/102 goed).
- Volgende stappen: de maatduur-meldingen op de andere stukken uitzoeken (welke stap mist wat); de keten in de browser (C8: Web Worker, pdf-beelden, herkenning, opbouw, herstelketen, concept in de editor); repetitiecijfers en maatnummers (C7 deel 2); hokjes (1. en 2.).
- Digitale pdf's direct lezen (D1) is lastiger dan gedacht: Finale bedt het lettertype Maestro in met een eigen codering per pdf. Opties: eigen lettertype-tekenaar (CFF/TrueType) of pdf.js (nieuwe bibliotheek, akkoord van Mels nodig). Nog niet besloten.

## Editor: slepen uit het palet (9 nov avond, wens van Mels)
Plan: `plannen/2026-11-09-palet-slepen.md`. Dynamiek, cresc. en dim. komen bij slepen altijd bij de dichtstbijzijnde noot (#1859), een haak op een noot loopt tot de volgende noot (#1858), en slepen uit het palet gaat met een zwevend kaartje (pointer events, ook met een vinger; `app/public/js/views/paletsleep.js`). Let op bij nakijken in de browser: zonder inloggen verbergt de lokale server de partituur (`.inloggen-niet-ingelogd`), en in een verborgen browservenster lopen animaties en requestAnimationFrame niet.

## Uitvoerders (9 nov)
- Claude (`agent-claude`): Claude Code met het tweede account (Pro), inlog in `~/.claude-uitvoerder` (`automatisering/claude-inloggen.ps1`). Model `sonnet`. Deed in de nacht van 8 op 9 nov vrijwel alles; met een exacte diff in de taak duurt een taak ongeveer een minuut.
- Codex: gebruikslimiet tot dinsdag 10 nov 15:48 (getest); de reserve (Claude) neemt Codex-taken over.
- Gemini (`gemini-flash-lite-latest`, API-sleutel in GEMINI_API_KEY) en Hermes (gratis model, alleen kleine taken met `--verwacht`) werken.
- Copilot: maandquotum op tot de nieuwe maand.

## Werkwijze die werkt (nacht 8 op 9 nov)
- Claude schrijft de code en de tests in een eigen werkkopie (`git worktree add`), meet op de echte stukken (`automatisering/echte-controle.sh` met `VERGELIJK_UIT`), en zet de taak klaar met de exacte diff en de test (`maak-taak.sh --voor claude`, `--test-aanpassen` als een bestaande test mee moet). Het script controleert en merget.
- Na een interfacegolf de app in de browser openen (zie het nachtrapport: vier interfacefouten die de tests niet zagen). `app/test/app-api.test.mjs` bewaakt nu dat elke `app.x` in de browsercode bestaat.
- Een onafhankelijke review (subagent) na een reeks wijzigingen vond acht echte fouten; doen na elke grote wijziging.

## Scanner: stand van de meting (9 nov, 02:40)
| Stuk | Maten (blad) | Opmerking |
|---|---|---|
| Galop | 104 (105) | 4 maatduur-meldingen (was 19); hokje 1 samengevoegd |
| Devils Galop | 102 (102) | alle 15 repetitiecijfers op hun maat; maatduur 1 |
| Distant Land | 130 (134) | was 928 bij het begin van de nacht |
| Renaissance | 255 | 13 maten ontbreken vóór regel 106 (melding) |
| Sand and Stars | 479 | één partij (was vier) |
| Suite Gothique | 279 | één partij (was twee) |
| African Symphony | 60 | referentie van Mels nodig |
| Masque | - | liggende scan van twee pagina's; duidelijke melding |

## Valkuilen
- De hartslag (Windows-taak, elk uur om :36) start zelf wachtrijen. Pas `automatisering/*.sh` nooit aan terwijl er een `werkpakket.sh` draait.
- Taakcontrole faalt op verwijdertaken en nieuwe mappen (zet een `.gitkeep`).
- Gebruik nooit `agent-terug` om een nieuwe taak voor te trekken.
- Een bestand `nul` in een agent-kloon breekt de schoonmaak (verwijderen met `[System.IO.File]::Delete('\?\...\nul')`).
- Code via een Python-heredoc in de Bash-tool: `\b` wordt een backspace; gebruik raw strings of de Edit-tool. Controleer of een "nieuwe" bestandsnaam vrij is (`app/src/model/triolen.mjs` bestond al).

## Mels moet nog
- 2 pagina's referentie van African Symphony (MusicXML).
- Besluiten uit `voorraad.md` (Wacht op een besluit van Mels): Audiveris-development, copisteria en PDMX (downloads), pdf.js. Origineel naast de scan: nee; knop Invoegen en paletten met slepen: gebouwd op 9 nov.
