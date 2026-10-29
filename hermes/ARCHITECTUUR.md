# Architectuur: Claude plant, goedkope agents bouwen, een script bewaakt

Deze pagina beschrijft de opzet van de agent-werkwijze voor SCORE2SOUND: wie wat doet, hoe een taak loopt, welke controles er zijn, welke accounts erachter zitten en wat er later bij kan. De werkwijze per stap staat in `hermes/WERKWIJZE.md`.

De opzet komt uit een werkend overdrachtspakket van een ander project en is hier herschreven voor SCORE2SOUND en de accounts van Mels. Scriptlogica, labels, statusbestanden en paneel zijn gelijk gebleven; de uitvoerders, de tests en de regels zijn aangepast.

## 1. Het idee
1. **Mels** stuurt met ideeën. **Claude** (het sterke model) werkt elk idee uit tot een plan, knipt het in kleine taakpakketten, schrijft de tests, verdeelt het werk, controleert en merget.
2. **Goedkopere agents** bewerken alleen bestanden: Codex en Copilot bouwen, Hermes doet kleine achtergrondtaken. Ze draaien geen commando's en zien geen git.
3. **Een script** doet alles eromheen en beoordeelt wat er echt veranderd is, niet wat de agent zegt.
4. **GitHub is het bord:** issues zijn taken, labels zijn de stand, PR's zijn het resultaat.
5. **Mels** keurt elk plan goed, regelt abonnementen en logt zelf in.

De hoofdregel: **een agent bewerkt alleen bestanden. Alles wat gecontroleerd moet worden, doet een script of een mens.**

## 2. De stroom
```
 Mels: idee
    │
    ▼
 Claude                 GitHub                  werkpakket.sh, één wachtrij per uitvoerder      Claude
 ------                 ------                  ------------------------------------------      ------
 plan (skill idee)      issue + label voor      codex   ─┐ eigen kloon per uitvoerder
 akkoord van Mels       agent-codex/-copilot/   copilot ─┤
 tests + maak-taak.sh   -hermes, agent-ready    hermes  ─┘
               ──────►              ──────────► 1 kies taak (terug voor ready, geen gedeelde bestanden)
                                                2 kloon schoon, branch agent/<nr>-<naam>
                                                3 agent bewerkt bestanden
                        label agent-bezig       4 echte diff, terugdraaien buiten ## Bestanden
                                                5 regels-controle.mjs (met syntax) + tests.sh
                        label agent-vast  ◄──── 5x faalt: fout terug naar de agent (2 rondes), dan pas vast
                        PR + agent-review ◄──── 6 push, PR met echte uitkomsten
                        merge + gesloten  ◄──── 7 precies ## Verwacht en Action groen: script merget zelf
                        Action PR-controle                                         review.sh: alleen de rest
                        label agent-terug ◄────────────────────────────────────────────────── afkeuren
                        merge             ◄────────────────────────────────────────────────── goedkeuren
```

## 3. Rollen
| Rol | Wie | Doet |
|---|---|---|
| Ideeën | Mels | wat er gebouwd wordt, akkoord op het plan |
| Planner | Claude | plan, taakpakketten, verdeling, tests, bij lastige stukken de exacte code |
| Builder | Codex en Copilot; Hermes voor kleine achtergrondtaken (zie 4) | bewerkt de bestanden uit het issue, niets anders |
| Poortwachter | `werkpakket.sh`, `regels-controle.mjs`, `tests.sh`, GitHub Action `PR-controle` | bestanden, regels, tests |
| Judge | Claude | diff, browsercontrole bij een interface, merge |
| Eigenaar | Mels | akkoord, abonnementen en tegoed, inloggen en tokens, branch protection |

## 4. Uitvoerders en accounts
Een abonnement in een app is niet vanzelf toegang voor een script. Per bron:

| Uitvoerder | Account | Hoe het script hem aanroept | Stand (29 oktober 2026) |
|---|---|---|---|
| **Codex-programma** (`agent-codex`, ook voor taken zonder label) | ChatGPT Plus van Mels | `node .../@openai/codex/bin/codex.js exec --ephemeral --json -s workspace-write --disable shell_tool --disable unified_exec -o laatste.txt - < prompt` | werkt: ingelogd met ChatGPT, proef met één regel in 28 s |
| **Copilot-programma** (`agent-copilot`) | GitHub Copilot via studentenabonnement | `node .../@github/copilot/npm-loader.js -p <prompt> --no-ask-user --allow-tool=write --deny-tool=shell` met `GH_TOKEN` uit `gh` | werkt: proef met één regel in 26 s |
| **Hermes** (`agent-hermes`, en de laatste reserve) | OpenRouter, 13 euro tegoed | `hermes -t terminal,file --provider openrouter -m <model> -z <prompt>` | geïnstalleerd, OpenRouter-sleutel ingesteld door Mels |

Modellen via OpenRouter (prijzen gecontroleerd op 29 oktober 2026, per miljoen tokens erin en eruit):
- `anthropic/claude-haiku-5.5`: laatste reserve als niemand iets deed, en reserve voor Hermes-taken, 0,10 en 0,50 dollar. In de bron ongeveer een cent per kleine taak.
- `cohere/north-mini-code:free`: eerste model voor `agent-hermes`. Met tegoed boven de 10 dollar geldt een limiet van 1.000 verzoeken per dag, gedeeld door alle gratis modellen. Traag (enkele minuten per taak).
- `deepseek/deepseek-v4-flash`: zeer goedkoop alternatief (0,09 en 0,18 dollar), maar veranderde in de bron een bestaande regel. Alleen met `--verwacht`.

### Wie krijgt wat
Claude kiest per taak (zie de skill `idee`): Codex voor logica, data, taken met meerdere bestanden en tests; Copilot voor interface, opmaak en kleinere codetaken; Hermes voor kleine mechanische achtergrondtaken (teksten, documentatie, configuratie), altijd met `## Verwacht`. Wat niet in een kleine taak past, doet Claude zelf.

### Reserveketen
Doet een uitvoerder niets (limiet op, abonnement nog niet actief, model faalt), dan neemt de volgende het over in dezelfde kloon:
- Codex, dan Copilot, dan Hermes met Haiku;
- Copilot, dan Codex, dan Hermes met Haiku;
- Hermes met het gratis model, dan Hermes met Haiku.

Raakt de limiet van Codex of Copilot op, dan doet de ander het werk dus vanzelf.

### Waarom Codex en Copilot zonder shell
Een klein model dat tests mag draaien, gaat dat ook doen, en blijft opnieuw proberen. Dat kostte in de bron 254 seconden voor één regel. Zonder shell kan de agent alleen bestanden lezen en schrijven; het script draait daarna de controles. Bij Codex zijn daarvoor de functies `shell_tool` en `unified_exec` uitgezet; bestanden bewerken loopt via de eigen bewerkfunctie van Codex. De sandbox `workspace-write` houdt het schrijven binnen de kloon. Hermes heeft geen aparte schakelaar voor alleen bestanden; daar beperkt `-t terminal,file` de gereedschappen, en het script vangt de rest op.

Maakt een agent toch zelf een commit, dan zet het script die terug naar losse wijzigingen (`git reset --soft` naar het beginpunt) en controleert het gewoon verder.

## 5. Bestanden in de repo
| Pad | Wat |
|---|---|
| `CLAUDE.md` | afspraken voor Claude: rol, taken schrijven, PR's controleren |
| `AGENTS.md` | afspraken voor uitvoerende agents (Codex leest dit bestand zelf in) |
| `werkpakketten/00-werkwijze.md` | harde regels voor elke agent |
| `werkpakketten/voorraad.md` | werkvoorraad voor het nachtplan |
| `hermes/werkpakket.sh` | de runner voor één taak |
| `hermes/werkpakketten.sh` | alle taken achter elkaar, of parallel |
| `hermes/maak-taak.sh` | maakt een issue in het vaste sjabloon |
| `hermes/regels-controle.mjs` | controleert een diff |
| `hermes/tests.sh` | draait de tests, voor script en Action |
| `hermes/review.sh` | overzicht voor Claude: wat er per PR nog nodig is |
| `hermes/tokens.py` | tokengebruik van een run |
| `hermes/skills/score2sound-werkpakket/SKILL.md` | Hermes-skill voor de handmatige route |
| `.github/ISSUE_TEMPLATE/agent-taak.md` | het issue-sjabloon |
| `.github/workflows/pr-controle.yml` | de Action op elke PR |
| `.claude/skills/agents/` | de paneel-mod (`/agents-paneel`) |
| `.claude/skills/idee/` | skill: van een idee van Mels naar een plan en taakpakketten |
| `.claude/skills/nachtplan/` | skill om tot een eindtijd door te werken |
| `werkpakketten/plannen/` | een plan per idee, met de pakketten en wie ze bouwt |
| `.claude/skills/*` (overige) | algemene designskills, gebruikt in de extra controleronde |
| `.gitattributes` | `*.sh` houdt LF, anders werkt Bash niet |

## 6. Het contract: het issue
`maak-taak.sh` maakt issues in dit vaste sjabloon. Het script en de mod lezen deze koppen letterlijk:
```
## Doel
## Bestanden        <- VERPLICHT: regels "- `pad`"; alleen deze mogen veranderen
## Wat je doet      <- genummerde stappen
## Verwacht         <- OPTIONEEL: codeblok met de exacte toe te voegen regels
## Acceptatiecriteria
## Niet doen
## Bron
```
- Zonder regels `- ` met een pad tussen backticks onder `## Bestanden` wordt de taak `agent-vast`.
- Het script zet `Hoort bij #<nr>` in de PR-tekst. De herstelronde en de mod vinden de PR via dat nummer.

## 7. Labels en levenscyclus
| Label | Kleur | Betekenis | Wie zet het |
|---|---|---|---|
| `agent-ready` | 0E8A16 | klaar om op te pakken | Claude, `maak-taak.sh` |
| `agent-bezig` | FBCA04 | een agent werkt eraan | script |
| `agent-review` | 1D76DB | PR open, Claude controleert | script |
| `agent-terug` | D93F0B | PR afgekeurd, agent past aan | Claude |
| `agent-vast` | B60205 | script kon niet verder, reden als comment | script |
| `agent-codex` | 10A37F | Codex bouwt deze taak | `maak-taak.sh --voor codex` |
| `agent-copilot` | 5B8DEF | Copilot bouwt deze taak | `maak-taak.sh --voor copilot` |
| `agent-hermes` | 9B7BE0 | kleine achtergrondtaak voor Hermes | `maak-taak.sh --voor hermes` |
| `agent-exact` | BFD4F2 | (op de PR) diff is precies `## Verwacht` | script |

Het script zet altijd precies één van de eerste vijf labels op een issue: het nieuwe erbij, de andere vier eraf. Het label voor de uitvoerder blijft staan.

## 8. Controles
1. **Bestanden:** het script draait elke wijziging buiten `## Bestanden` terug en meldt dat in de PR.
2. **Verwacht:** met `## Verwacht` vergelijkt het script de toegevoegde regels letterlijk (label `agent-exact`).
3. **Regelcontrole** (`regels-controle.mjs`), op de diff na de commit:
   - fout: bestand buiten de lijst, syntaxfout (JavaScript, JSON, Python), diff groter dan 150 regels, verdwenen regeleinde, iets wat op een sleutel of token lijkt, een `.env`-bestand, een nieuwe dependency in `package.json`, `requirements*.txt` of `pyproject.toml`, en in `FRONTEND_MAPPEN` een inline script of externe bron;
   - waarschuwing: een testbestand gewijzigd, een bestand verwijderd.
4. **Tests** (`tests.sh`): per projectmap `npm test` of `python -m pytest`, beoordeeld op de exitcode. Zolang er nog geen tests zijn, is dat geen fout.
5. **GitHub Action `PR-controle`:** dezelfde regelcontrole en tests op elke PR naar `main`, als tweede verdedigingslinie. De grens van 150 regels geldt alleen voor branches `agent/*`.
6. **Herstelrondes:** faalt 3, 4 of de vergelijking met `## Verwacht`, dan krijgt dezelfde agent de foutmelding en zijn huidige wijziging terug en herstelt hij het zelf, hooguit twee keer. Pas daarna wordt de taak `agent-vast`.
7. **Automatisch mergen:** is de wijziging precies `## Verwacht`, niets teruggedraaid, geen waarschuwing en de Action groen, dan merget het script zelf. Claude schreef die inhoud al in de taak.
8. **Claude:** begint met `bash hermes/review.sh` en beoordeelt alleen wat overblijft, en alleen wat een script niet kan: of het doet wat de taak bedoelt. Claude doet de controles van het script niet opnieuw.

De projectregels (welke mappen frontend zijn, eigen stijlregels) komen erbij zodra Mels het project heeft uitgelegd.

## 9. Het paneel
De mod `.claude/skills/agents` toont in de Claude-desktop-app per taak de zes stappen (Plan, Wachtrij, Uitvoeren, Controle, PR, Review) en een kaart per rol. Hij leest:
- `~/.aiflow-status/<uitvoerder>.json`, wat de runner nu doet (fase, voortgang, model);
- `~/.aiflow-status/geschiedenis.jsonl`, een regel per afgeronde taak (uitvoerder, model, seconden, tokens);
- `gh issue list` en `gh pr list` voor de labels, en `hermes status` als Hermes er is.

Codex heeft een eigen kaart en kleur. Openen met `/agents-paneel`.

## 10. Fase 2: meerdere agents tegelijk
Begin met één wachtrij met de hand, tot een paar echte taken goed zijn gegaan. Zet daarna `--alle` aan, en pas als dat niet genoeg is het Kanban-bord.

### 10a. Gebouwd: een wachtrij per uitvoerder
`bash hermes/werkpakketten.sh --alle` start drie wachtrijen tegelijk (Codex, Copilot, Hermes), elk in een eigen kloon (`<kloon>-codex`, `-copilot`, `-hermes`). Elke wachtrij pakt alleen de taken met zijn label en werkt er één tegelijk af. Een taak die een bestand deelt met een lopende taak of een open PR wacht tot die klaar is. De poortwachter is voor elke taak gelijk. Daarnaast bestaat nog `--parallel N` (tot N taken tegelijk, ongeacht de uitvoerder).

### 10b. Daarna, als dat niet genoeg is: het Kanban-bord van Hermes
Bouwstenen in Hermes (controleer commando's met `hermes <commando> --help`):
- **profielen** (`hermes profile`): elk profiel is een agent met een eigen model, provider en beschrijving;
- **Kanban-bord** (`hermes kanban`): taken per profiel, afhankelijkheden (`link`), model per taak (`set-model`), een reviewronde (`request-review`, `request-changes`) en `swarm` met parallelle werkers, een verifier en een synthesizer;
- **uitval opvangen:** `hermes fallback` (keten van modellen), `hermes usage`, `kanban reclaim` en `kanban reassign`;
- **noodrem:** `hermes pause` en `hermes resume`.

Voorgestelde profielen voor de accounts van Mels:
| Profiel | Taak | Model |
|---|---|---|
| `bouwer-sterk` | logica, taken met meer dan twee bestanden | `anthropic/claude-sonnet-5.5` via OpenRouter (duur, alleen als het nodig is) of Copilot zodra dat actief is |
| `bouwer-licht` | kleine fixes, teksten | `anthropic/claude-haiku-5.5` of het gratis `cohere/north-mini-code:free` |
| `controleur` | eerste controle van elke PR | `anthropic/claude-haiku-5.5` |

Codex draait niet als Hermes-profiel; die blijft via het runner-script werken. Of Hermes het ChatGPT-account kan gebruiken, controleren we met `hermes model` als fase 2 begint.

Stroom: Claude knipt het plan in taken en zet ze op het bord (`create`, `assign`, `link`). Taken die dezelfde bestanden raken, worden aan elkaar gekoppeld zodat ze na elkaar lopen. Valt een agent uit, dan gaat de taak met `reassign` naar een ander profiel. Als alles klaar is, doet Claude de eindcontrole per PR en merget.

**Voorwaarde:** ook in fase 2 eindigt elke taak in een PR die door de regelcontrole, de tests, de Action en Claude gaat, en geen agent merget. In de bron meldde een model via Hermes dat het een PR had aangepast terwijl er niets veranderd was. Daarom kwam het runner-script er. Het bord mag het verdelen overnemen, het controleren niet.

Risico's: meer agents betekent meer plekken waar iets misgaat. Gratis modellen volgen harde regels minder trouw. Abonnementen kunnen automatisch gebruik beperken; lees de voorwaarden van ChatGPT, Copilot en OpenRouter.

## 11. Veiligheid
- Branch protection op `main`: PR verplicht, later ook de check `controle`. Agents mergen nooit en pushen nooit naar `main`.
- Een agent krijgt alleen schrijfrechten voor bestanden (zie 4).
- Geen tokens in de repo of in een chat. De regelcontrole keurt iets wat op een sleutel lijkt af. Een geplande taak heeft later `GH_TOKEN` nodig: dat zet Mels zelf, liefst als fine-grained token met alleen rechten op deze repo (Contents, Pull requests, Issues).
- Installeer geen community-skills of plugins zonder ze helemaal te lezen.

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

## 13. Gemeten op 29 oktober 2026
Een echte ronde op GitHub, met `werkpakketten.sh --alle`:
| Taak | Uitvoerder | Tijd | Tokens (erin, eruit) | Uitkomst |
|---|---|---|---|---|
| regel in README, met `## Verwacht` | Codex (ChatGPT Plus) | 69 s | 134k, 1,6k | PR, precies zoals verwacht, Action groen |
| regel in een ander bestand, met `## Verwacht` | Hermes, `cohere/north-mini-code:free` | 42 s | 17k, 0,5k | PR, precies zoals verwacht, Action groen |
| taak zonder `## Bestanden` | Codex | 6 s | 0 | `agent-vast` met de reden, niets gepusht |
| afgekeurde PR, één punt | Codex | 22 s | 35k, 0,2k | punt verwerkt, comment op de PR, terug naar `agent-review` |

De drie wachtrijen liepen tegelijk; Copilot had geen taken. Herstelrondes, terugdraaien en automatisch mergen zijn lokaal getest met nep-agents (zie de PR van deze werkwijze).

Tweede ronde, met automatisch mergen en alle drie de uitvoerders tegelijk:
| Taak | Uitvoerder | Tijd tot PR | Tokens (erin, eruit) | Uitkomst |
|---|---|---|---|---|
| nieuw bestand, met `## Verwacht` | Codex | 34 s | 33k, 0,2k | precies zoals verwacht, Action groen, door het script gemerged |
| nieuw bestand, met `## Verwacht` | Copilot (studentenaccount) | 26 s | 54k, 0,2k | precies zoals verwacht, Action groen, door het script gemerged |
| nieuw bestand, met `## Verwacht` | Hermes, gratis model | 38 s | 11k, 0,4k | precies zoals verwacht, Action groen, door het script gemerged |
| taak zonder `## Bestanden` | Hermes | 6 s | 0 | `agent-vast` met de reden; de wachtrij van Hermes stopte, de andere liepen door |

Claude hoefde niets na te kijken: `review.sh` meldde alleen de vastgelopen taak.

## 14. Wat nog niet getest is
- Herstelrondes en de reserveketen met een echt model (lokaal wel getest).
- De paneel-mod in deze repo.
- Fase 2b (Kanban).
