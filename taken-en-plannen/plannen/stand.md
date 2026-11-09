# Stand (bijgewerkt 9 nov 2026, ochtend)

## Eerste handelingen in elke chat
- `bash automatisering/hartslag.sh` en `bash automatisering/review.sh`.
- Controleer dat er hooguit één `werkpakketten.sh` draait (PowerShell: `Get-CimInstance Win32_Process -Filter "Name='bash.exe'" | ? CommandLine -match 'werkpakketten'`). Start voor een losse taak: `bash automatisering/werkpakketten.sh` (één wachtrij).
- Richting (sinds 9 nov): alles in de browser, zonder server: eigen herkenning naar het voorbeeld van Audiveris, inloggen met Google (`plannen/2026-11-09-browser-herkenning.md`). Audiveris blijft alleen meetlat op de pc van Mels. Daarvoor: werkende scanner met verbeteren in de editor (`plannen/2026-11-08-scanner.md`). Laatste nachtrapport: `nacht/rapport-2026-11-08.md`. Wensen en open punten: `voorraad.md`.

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
