# Architectuur (kort)

Claude plant en controleert; goedkope agents (Codex, Copilot, Gemini, Hermes) bouwen op eigen branches; `automatisering/werkpakket.sh` doet alles eromheen (controleren, committen, pushen, PR, labels, mergen). De commando's staan in `WERKWIJZE.md`. De volledige oude tekst staat in de git-geschiedenis.

Het contract is het issue: `## Doel`, `## Bestanden` (verplicht, alleen deze mogen veranderen), `## Wat je doet`, `## Verwacht` (optioneel, exacte regels), `## Acceptatiecriteria`, `## Niet doen`. Het script draait wijzigingen buiten `## Bestanden` terug, controleert syntax en tests, geeft fouten maximaal twee keer terug en merget zelf bij `## Verwacht` plus groen.

Reserveketen: codex -> copilot -> hermes-reserve; gemini -> copilot -> codex -> hermes-reserve; hermes -> hermes-reserve (gratis model).

## 12. Valkuilen
Uit de bron:
1. Een klein model meldt dat het klaar is zonder iets gedaan te hebben. Het script kijkt naar de echte diff.
2. Een model besluit zelf "er is niets te doen". Het script kiest de taak en geeft die als opdracht.
3. `python -I` negeert `PYTHONUTF8`: gebruik `python -I -X utf8`.
4. `gh issue edit` met hetzelfde label in `--add-label` en `--remove-label` haalt het weg. `zet_labels` verwijdert alleen de andere.
5. Een opruimstap die halverwege stopt, laat oude wijzigingen staan. Eerst `git reset --hard` en `git clean`.
6. Direct na een label vindt `gh issue list --label` het issue soms nog niet; `werkpakketten.sh` wacht daarom drie keer 20 seconden.
7. Windows-paden met backslashes in code worden als speciale tekens gelezen. Gebruik schuine strepen.
8. Een geplande taak ziet de login uit de sleutelhanger niet: `GH_TOKEN` nodig.
9. Het Git-inlogvenster blokkeert een achtergrondtaak: eenmalig `gh auth setup-git` in de kloon.
10. Een verboden patroon in de regelcontrole keurt het script zelf af: schrijf het in stukken of als tekencodes.
11. De regelcontrole moet na de commit draaien, anders controleert hij niets.
12. Gratis modellen van OpenRouter delen één daglimiet.
13. Het `.bat`- of `.cmd`-bestandje van een programma kapt opdrachten met meerdere regels af. Roep Copilot en Codex daarom via `node` aan, Codex met de opdracht via stdin.
14. Shellscripts moeten LF houden (`.gitattributes`). Op deze computer staat `core.autocrlf=true`.

Nieuw voor deze opzet:
15. Codex leest `AGENTS.md` zelf in. De route via het script staat daarom bovenaan in `AGENTS.md`: alleen bestanden bewerken, niets draaien.
16. Draai het runner-script niet vanuit een kloon van de agent: het script zet de kloon terug op `origin/main` en zou dan zijn eigen bestand overschrijven terwijl het draait. Start het vanuit `C:\SCORE2SOUND`.
17. ChatGPT Plus heeft een gebruikslimiet per paar uur. Doet Codex daardoor niets, dan neemt de reserve (Copilot, daarna Hermes met Haiku) het over.
18. GitHub Actions op een privérepo kan stoppen door een betalingsinstelling ("recent account payments have failed"). De repo is daarom openbaar. Als Actions niet draait, zet `AIFLOW_ACTION=uit`; het script draait dezelfde controles zelf.
19. Codex leest veel context in (rond 130k tokens voor een taak van één regel, grotendeels uit de cache). Dat telt mee voor de limiet van ChatGPT Plus; houd taken klein en precies.
20. GitHub weigert een push soms even (`remote rejected ... (failed)`), ook als alles klopt. De runner probeert een push daarom drie keer, met 15 en 30 seconden pauze. Lukt het toch niet, dan staat de branch er vaak al wel: push hem opnieuw en open de PR met de hand.

