# Stand (bijgewerkt 8 nov 2026)

## Eerste handelingen in elke chat
- `bash automatisering/hartslag.sh` en `bash automatisering/review.sh`.
- Controleer dat precies een `werkpakketten.sh` draait (PowerShell: `Get-CimInstance Win32_Process -Filter "Name='bash.exe'" | ? CommandLine -match 'werkpakketten'`). Start: `AIFLOW_UITVOERDER=hermes bash automatisering/werkpakketten.sh --alle`.
- Richting: `plannen/2026-11-07-richting.md`. Laatste nachtrapport: `nacht/rapport-2026-11-07.md`. Wensen: `voorraad.md`.

## Uitvoerders (getest 8 nov, 20:45)
- Claude (`agent-claude`): Claude Code met een tweede account, inlog in `~/.claude-uitvoerder` (`automatisering/claude-inloggen.ps1`). Model `sonnet`, alleen Read/Edit/Write/Glob/Grep. Eerste reserve voor Codex, Copilot en Gemini. Let op: de inlog pakte het account dat in de browser openstond (mels123.nl, Max); deze chat draait op jumbobros9. Welk account de uitvoerder hoort te zijn, beslist Mels.
- Hermes: gratis model `cohere/north-mini-code:free`, werkt weer (pad was fout na het hernoemen), ~50 s per aanroep.
- Gemini: `gemini-flash-lite-latest` (API-sleutel in GEMINI_API_KEY), werkt.
- Codex: op tot 10 nov 15:48 (getest).
- Copilot: maandquotum op (getest), tot de nieuwe maand.

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

## 8 nov, avond (Mels heeft nu Claude Max)
- Claude Code als vijfde uitvoerder `agent-claude` (sonnet, tweede account). Eerste taak #1670 in 3 min gemerged. Claude is de eerste reserve voor Codex, Copilot en Gemini.
- Hermes-pad hersteld: na het hernoemen wees `werkpakket.sh` naar `AppData\Local\automatisering\...`, waardoor elke Hermes-reserve faalde en 1665, 1666, 1668, 1674 en 1670 vastliepen (niet door de taak zelf).
- Runner bewaart nu de reden van `vast` in `geschiedenis.jsonl`; het Agents-paneel is opnieuw ingedeeld (Actie nodig met reden, compacte taken, rij per uitvoerder).
- Open: 1665, 1666, 1668, 1674 opnieuw starten (liefst bij `agent-claude`, na het accountbesluit van Mels); 1672 splitsen.

## Valkuil (8 nov)
- De hartslag (Windows-taak, elk uur om :36) start zelf wachtrijen. Pas `automatisering/*.sh` dus nooit aan zonder eerst te kijken of er een `werkpakket.sh` draait: een aanpassing tijdens een run brak #1675 af.
