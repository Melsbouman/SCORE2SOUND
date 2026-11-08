# Stand (bijgewerkt 8 nov 2026)

## Eerste handelingen in elke chat
- `bash hermes/hartslag.sh` en `bash hermes/review.sh`.
- Controleer dat precies een `werkpakketten.sh` draait (PowerShell: `Get-CimInstance Win32_Process -Filter "Name='bash.exe'" | ? CommandLine -match 'werkpakketten'`). Start: `AIFLOW_UITVOERDER=hermes bash hermes/werkpakketten.sh --alle`.
- Richting: `plannen/2026-11-07-richting.md`. Laatste nachtrapport: `nacht/rapport-2026-11-07.md`. Wensen: `voorraad.md`.

## Uitvoerders
- Hermes: gratis model `cohere/north-mini-code:free`, langzaam maar werkt.
- Gemini: `gemini-flash-lite-latest` (API-sleutel in GEMINI_API_KEY).
- Codex: standaard `gpt-6-luna` (nog niet getest); op tot 10 nov 15:48.
- Copilot: alleen gratis plan, op tot de nieuwe maand.

## Open
- 11 editor-taken (1660, 1662, 1665-1668, 1670, 1672-1675) staan in de wachtrij van Hermes en Gemini.
- Volgende stap: fase 1 (testset en meetscript), taken nog te maken.

## Valkuilen
- Taakcontrole faalt op verwijdertaken en nieuwe mappen (zet een `.gitkeep`).
- Gebruik nooit `agent-terug` om een nieuwe taak voor te trekken.
- Een bestand `nul` in een agent-kloon breekt de schoonmaak (verwijderen met `[System.IO.File]::Delete('\?\...\nul')`).
- Mels moet nog: 2 pagina's referentie, AGPL-besluit.
