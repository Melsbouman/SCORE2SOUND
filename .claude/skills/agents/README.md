# Agents: paneel voor Claude

Een mod voor Claude Code die de workflow met agents toont: per taak de fasen (Plan, Wachtrij, Uitvoeren, Controle, PR, Review), wie eraan werkt met hun rol (Claude, het Codex-programma, het Copilot-programma, Hermes, subagents), het tokengebruik en de modeltest. Hij staat in `.claude/skills/agents`, dus hij laadt in elke chat in dit project. Open het paneel met `/agents-paneel`.

Hij leest de statusbestanden en de geschiedenis die `hermes/werkpakket.sh` schrijft naar `~/.aiflow-status/`, en vraagt GitHub (`gh`) en Hermes om de stand.

In `hooks/register.tsx` staan bovenaan vaste paden voor de computer van Mels (`HERMES`, `GH`, `REPO`, `STATUSMAP`, `BENCHMAP`). Pas die aan op een andere computer.
