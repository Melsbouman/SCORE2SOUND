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
- Volgende stappen: hulplijnen weghalen aansluiten vóór de voortekens (keten en `pijplijn.mjs`) en de Galop-scan opnieuw bekijken; opbouw tot het model (C6: toonhoogte uit stap, sleutel, voortekening en voortekens; maten, maatsoort en meermaatsrusten met hun aantal); repetitiecijfers en maatnummers (C7 deel 2); dan de keten in de browser (C8). Inloggen met Google (A5) vraagt een OAuth-client-ID van Mels.
- Digitale pdf's direct lezen (D1) is lastiger dan gedacht: Finale bedt het lettertype Maestro in met een eigen codering per pdf. Opties: eigen lettertype-tekenaar (CFF/TrueType) of pdf.js (nieuwe bibliotheek, akkoord van Mels nodig). Nog niet besloten.

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
