# Werkwijze (kort)

Claude plant en controleert, agents bouwen, `hermes/werkpakket.sh` doet de rest. Opzet: `ARCHITECTUUR.md`. De uitgebreide oude tekst staat in de git-geschiedenis.

## Taak maken
`bash hermes/maak-taak.sh --voor codex|copilot|gemini|hermes ...` (sjabloon: `.github/ISSUE_TEMPLATE/agent-taak.md`). Klein, een doel, exacte bestanden, controleerbare criteria. `--verwacht` met de exacte regels bij mechanische wijzigingen (altijd voor Hermes), `--controle` met een opdracht, `--maxregels N`. Nieuwe functie: Claude zet eerst de testcode in de taak. Hermes: kleine mechanische taken (het gratis model).

## Uitvoeren
`bash hermes/werkpakketten.sh --alle` (een wachtrij per uitvoerder, elk in een eigen kloon). Taken die een bestand delen met lopend werk wachten. Per taak: kiezen, branch `agent/<nr>-<naam>`, agent aanroepen (alleen schrijven), wijzigingen buiten `## Bestanden` terugdraaien, regelcontrole en tests, twee herstelrondes, push, PR, en mergen als de wijziging precies `## Verwacht` is of `## Controle` slaagt en alles groen is (`AIFLOW_AUTOMERGE=uit` zet dat uit). Vastgelopen: eenmalig overzetten naar de reserve; daarna `agent-vast` voor Claude. Faalt de Action drie keer, dan `agent-vast`.

## Labels
`agent-ready` klaar; `agent-bezig` (een per uitvoerder); `agent-review` PR open; `agent-terug` afgekeurd; `agent-vast` script kon niet verder; `agent-codex|copilot|gemini|hermes` wie bouwt; `agent-exact` (op de PR) diff is precies `## Verwacht`. Gebruik `agent-terug` nooit om een nieuwe taak voor te trekken.

## Controleren (Claude)
`bash hermes/review.sh` toont wat nog nodig is. "Action faalt": alleen `gh pr checks <nr>`, dan `agent-terug` met de melding en script opnieuw. `agent-vast`: taak kleiner of zelf doen. Afkeuren: korte punten per bestand. Merge: `gh pr merge <nr> --merge --delete-branch`, issue sluiten.

## Handig
- `bash hermes/hartslag.sh` (draait ook elk uur als Windows-taak; log `~/.aiflow-status/hartslag.log`).
- `bash hermes/tests.sh`; `bash hermes/echte-controle.sh <pdf> [paginas]` voor een echte herkenning (partituren nooit in de repo).
- Echte partituren staan alleen lokaal (auteursrecht).

## Instellingen
| Variabele | Standaard | Betekenis |
|---|---|---|
| `AIFLOW_ALLEEN` | leeg | alleen de wachtrij van deze uitvoerder (zet `werkpakketten.sh --alle` zelf) |
| `AIFLOW_STANDAARD` | `codex` | uitvoerder voor een taak zonder label |
| `AIFLOW_UITVOERDER` | leeg | dwingt een uitvoerder af, ook boven het label (voor testen) |
| `AIFLOW_CODEX_MODEL` | `gpt-6-luna` | model van het Codex-programma; `standaard` is het model uit `~/.codex/config.toml` |
| `AIFLOW_COPILOT_MODEL` | `auto` | model van het Copilot-programma |
| `AIFLOW_GEMINI_MODEL` | `gemini-flash-lite-latest` | model van de Gemini CLI |
| `AIFLOW_HERMES_MODEL`, `AIFLOW_HERMES_PROVIDER` | `cohere/north-mini-code:free`, `openrouter` | model voor `agent-hermes` |
| `AIFLOW_FALLBACK_MODEL` | `cohere/north-mini-code:free` | reserve bij niets doen; leeg zet de reserve uit |
| `AIFLOW_FALLBACK_PROVIDER` | `openrouter` | provider van de reserve |
| `AIFLOW_KLOON` | `/c/Users/mels1/SCORE2SOUND-agent` | aparte kloon voor de agent; met `--alle` komt `-codex`, `-copilot` of `-hermes` erachter |
| `AIFLOW_STATUS` | `~/.aiflow-status` | map voor de statusbestanden (de mod leest deze) |
| `AIFLOW_HERSTEL` | `2` | hoeveel herstelrondes het script een agent geeft na een fout |
| `AIFLOW_TESTTIJD` | `300` | seconden voordat `tests.sh` hangende tests stopt |
| `AIFLOW_AUTOMERGE` | `exact` | `exact`: het script merget PR's die precies `## Verwacht` zijn en groen; `uit`: Claude beslist altijd |
| `AIFLOW_ACTION` | `aan` | `uit`: bij automatisch mergen niet op de GitHub Action wachten (als Actions niet kan draaien); de eigen controles van het script tellen dan |

De prefix `AIFLOW_` en de map `~/.aiflow-status` komen uit de bron van deze werkwijze. Ze blijven zo, zodat scripts en mod op elkaar blijven passen.

