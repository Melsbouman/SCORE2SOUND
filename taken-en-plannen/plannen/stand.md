# Stand (bijgewerkt 8 nov 2026)

## Eerste handelingen in elke chat
- `bash automatisering/hartslag.sh` en `bash automatisering/review.sh`.
- Controleer dat precies een `werkpakketten.sh` draait (PowerShell: `Get-CimInstance Win32_Process -Filter "Name='bash.exe'" | ? CommandLine -match 'werkpakketten'`). Start: `AIFLOW_UITVOERDER=hermes bash automatisering/werkpakketten.sh --alle`.
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

## 8 nov, middag
- Mappen hernoemd: hermes -> automatisering, werkpakketten -> taken-en-plannen, scripts -> beheer (scripts `werkpakket.sh` e.d. houden hun naam). Hartslag-taak wijst naar het nieuwe pad.
- 1672 (nieuwe partituur) is `agent-vast`: Gemini maakte een PR van 649 regels (max 600); splits de taak in kleinere. Hermes kan lange taken niet aan ("Argument list too long"): geef Hermes alleen korte taken.
- 1662, 1660, 1667 zijn gemerged.
