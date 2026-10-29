# Werkwijze: Claude plant, agents bouwen, een script doet de rest

Dit is de werkwijze voor het werken met agents in SCORE2SOUND. Hij geldt voor Claude (in elke chat), voor uitvoerende agents en voor Mels. De harde regels (`AGENTS.md` en `werkpakketten/00-werkwijze.md`) blijven altijd gelden. Deze pagina beschrijft alleen hoe een taak van idee tot merge loopt.

De opzet, de keuzes en de valkuilen staan in `hermes/ARCHITECTUUR.md`.

## 1. In het kort
1. Mels geeft een idee. Claude werkt het uit tot een plan met kleine taakpakketten (skill `idee`) en zet na akkoord elk pakket als GitHub-issue klaar (`hermes/maak-taak.sh`), met een label voor wie het bouwt.
2. Een script (`hermes/werkpakket.sh`) pakt de taak op, laat een agent alleen de genoemde bestanden bewerken en doet zelf alles eromheen: controleren, committen, pushen, een PR openen en labels zetten.
3. Het script filtert de fouten eruit: faalt een controle, dan krijgt de agent de fout terug en herstelt hij het zelf (hooguit twee rondes). Is de wijziging precies wat de taak vroeg en alles groen, dan merget het script zelf.
4. Claude ziet alleen wat overblijft (`bash hermes/review.sh`) en beoordeelt alleen wat een script niet kan.

De hoofdregel: **een agent bewerkt alleen bestanden. Alles wat gecontroleerd moet worden, doet een script of een mens.** Een klein model kan melden dat het klaar is zonder iets gedaan te hebben. Vertrouw dus nooit op het rapport van een agent, maar op de diff.

## 2. Rollen
| Rol | Wie | Doet |
|---|---|---|
| Planner | Claude | schrijft de taak en de tests, kiest de bestanden, bij lastige stukken ook de exacte code |
| Builder | Codex-programma (`agent-codex`: logica, data, meerdere bestanden, tests), Copilot-programma (`agent-copilot`: interface, kleinere code), Hermes (`agent-hermes`: kleine achtergrondtaken) | bewerkt de bestanden uit het issue |
| Poortwachter | `hermes/werkpakket.sh`, `hermes/regels-controle.mjs`, `hermes/tests.sh` en de GitHub Action | bestanden, regels en tests |
| Judge | Claude | bekijkt de diff, merget |
| Eigenaar | Mels | ideeën, akkoord op elk plan, abonnementen, inloggen en tokens, branch protection |

## 3. Een taak schrijven
Een taak is klein genoeg voor een goedkoper model: een doel, de exacte bestanden, controleerbare criteria. Taken die dezelfde bestanden raken lopen nooit tegelijk. Gebruik het sjabloon in `.github/ISSUE_TEMPLATE/agent-taak.md`, of beter nog het script:

```bash
bash hermes/maak-taak.sh --voor codex --titel "Kort en concreet" --doel "Een zin" \
  --bestand pad/naar/bestand --bestand pad2 \
  --stap "Wat de agent doet" --stap "..." \
  [--verwacht "regel die precies moet worden toegevoegd"] \
  [--criterium "extra criterium"] [--niet "wat niet mag"] [--bron "verwijzing"] \
  # --voor codex | copilot | hermes
```

- **De sectie `## Bestanden` is verplicht.** Het script leest daaruit welke bestanden mogen veranderen, en draait elke wijziging buiten die lijst terug.
- **`--verwacht`** zet in het issue de regels die de wijziging precies moet toevoegen (en niets verwijderen). Komt de diff overeen, dan krijgt de PR het label `agent-exact` en kun je hem sneller nakijken.
- **`--voor`** zet het label voor de uitvoerder: `agent-codex` (standaard), `agent-copilot` of `agent-hermes`. Een taak voor Hermes gaat eerst naar het gratis model `cohere/north-mini-code:free` en moet klein en mechanisch zijn, altijd met `--verwacht`.
- **Tests eerst:** een nieuwe functie krijgt eerst een test (door Claude, of als taak met de exacte testcode). De taak voor de code noemt die test in de acceptatiecriteria. Het script draait de tests; een agent draait niets.
- Geef een agent nooit meer dan nodig is: precieze teksten en code in het issue maken het resultaat veel betrouwbaarder.

## 4. Uitvoeren
Start direct na het klaarzetten van de issues, vanuit je eigen werkmap:

```bash
bash hermes/werkpakketten.sh --alle   # Codex, Copilot en Hermes elk hun eigen wachtrij, tegelijk
```

Elke uitvoerder werkt in een eigen kloon (`C:/Users/mels1/SCORE2SOUND-agent-codex`, `-copilot`, `-hermes`) en pakt alleen de taken met zijn label; een taak zonder label is voor Codex. Een taak die een bestand deelt met een lopende taak of met een open PR wacht tot die klaar is. Zonder `--alle` is er één wachtrij voor alles; `--parallel N` kan ook. Een geplande taak in de Windows Taakplanner kan later, na een geslaagde handmatige test.

Wat `werkpakket.sh` doet, in volgorde:
1. Kiest de taak uit zijn wachtrij: eerst `agent-terug` (afgekeurde PR), anders het oudste `agent-ready`, en sla taken over die bestanden delen met lopend werk. Stopt als de wachtrij al een `agent-bezig` heeft.
2. Zet de eigen kloon schoon, maakt de branch `agent/<nummer>-<naam>` en zet `agent-bezig`.
3. Roept de agent aan, met alleen de rechten om bestanden te schrijven (geen shell, geen git).
4. Kijkt zelf welke bestanden echt zijn gewijzigd, draait wijzigingen buiten de lijst terug en vergelijkt met `## Verwacht`.
5. Commit, draait `regels-controle.mjs` (met syntaxcontrole) en `tests.sh`, en vergelijkt met `## Verwacht`.
6. Faalt iets, dan krijgt dezelfde agent de foutmelding en zijn huidige wijziging terug als herstelronde (`AIFLOW_HERSTEL`, standaard 2). Faalt het daarna nog, dan `agent-vast` met de reden als comment en er wordt niet gepusht. Een afwijking van `## Verwacht` mag na de laatste ronde wel door, zonder `agent-exact`.
7. Pusht, opent de PR (of plaatst een comment bij een afgekeurde PR) met de echte uitkomsten, en zet `agent-review`.
8. Is de wijziging precies `## Verwacht`, is er niets teruggedraaid, geeft de regelcontrole geen waarschuwing en is de Action groen, dan merget het script de PR en sluit het issue (`AIFLOW_AUTOMERGE=uit` zet dat uit).

Doet de agent niets (limiet op, abonnement nog niet actief), dan neemt een reserve het over: Codex en Copilot vangen elkaar op, en als laatste Hermes met `anthropic/claude-haiku-5.5` via OpenRouter. Een Hermes-taak gaat na het gratis model naar Haiku.

## 5. Labels op een issue
| Label | Betekenis |
|---|---|
| `agent-ready` | klaar om op te pakken |
| `agent-bezig` | een agent werkt eraan (maximaal één per uitvoerder) |
| `agent-review` | PR is open, Claude controleert |
| `agent-terug` | Claude heeft de PR afgekeurd, de agent past hem aan |
| `agent-vast` | het script kon niet verder, de reden staat als comment |
| `agent-codex`, `agent-copilot`, `agent-hermes` | wie de taak bouwt |
| `agent-exact` | (op de PR) de diff komt exact overeen met `## Verwacht` |

## 6. De PR controleren en mergen (Claude)
Claude doet de controles van het script niet opnieuw. Zo blijft Claude vrij voor plannen en voor wat echt beoordeling vraagt.
1. Draai `bash hermes/review.sh`. Dat zegt per open PR wat er nodig is: mergen zonder de diff te lezen, de diff vluchtig lezen, de diff lezen, of alleen de foutmelding van de Action. Ook de vastgelopen taken staan erin.
2. Lees de diff (`gh pr diff <nr>`) alleen als het overzicht dat zegt, en beoordeel alleen wat een script niet kan: doet het wat de taak bedoelt, klopt de logica, past het bij de rest.
3. **Bij een interface:** bekijk het resultaat één keer in de browser op 1366 en 375 px breed, zonder horizontale scroll.
4. Goed: `gh pr merge <nr> --merge --delete-branch` en sluit het issue met een korte opmerking.
5. Afkeuren: een korte comment per bestand op de PR, label `agent-terug` op het issue, en `werkpakketten.sh` opnieuw starten. Verbeter nooit ongemerkt zelf stukjes in de PR van een agent.

## 7. Onderdelen
| Bestand | Wat |
|---|---|
| `hermes/maak-taak.sh` | maakt een issue in het vaste sjabloon |
| `hermes/werkpakket.sh` | de runner voor een taak |
| `hermes/werkpakketten.sh` | pakt alle taken achter elkaar op, of parallel |
| `hermes/regels-controle.mjs` | controleert een diff: toegestane bestanden, syntax, sleutels en tokens, nieuwe dependencies, verwijderde bestanden, aangepaste tests, verdwenen regeleinde, te grote diff |
| `hermes/review.sh` | overzicht voor Claude: wat er per open PR nog nodig is, en de vastgelopen taken |
| `hermes/tests.sh` | draait de tests van de projectmappen (npm test of pytest), voor het script en de Action |
| `hermes/tokens.py` | bepaalt het tokengebruik van een run |
| `.github/workflows/pr-controle.yml` | draait de regelcontrole en de tests op elke PR |
| `hermes/ARCHITECTUUR.md` | de opzet, de keuzes, fase 2 en de valkuilen |

Start de scripts vanuit je eigen werkmap (`C:\SCORE2SOUND`); ze werken in de aparte kloon. De regelcontrole en de tests draaien vanuit de kloon, dus de versie op `main`. Statusbestanden en een geschiedenis van uitgevoerde taken (wie, welk model, tokens, tijd) staan in `~/.aiflow-status/`. De Claude-mod "Agents" (`.claude/skills/agents`) leest die map en toont de workflow per taak; hij opent met `/agents-paneel`.

## 8. Instellingen (omgevingsvariabelen)
| Variabele | Standaard | Betekenis |
|---|---|---|
| `AIFLOW_ALLEEN` | leeg | alleen de wachtrij van deze uitvoerder (zet `werkpakketten.sh --alle` zelf) |
| `AIFLOW_STANDAARD` | `codex` | uitvoerder voor een taak zonder label |
| `AIFLOW_UITVOERDER` | leeg | dwingt een uitvoerder af, ook boven het label (voor testen) |
| `AIFLOW_CODEX_MODEL` | `standaard` | model van het Codex-programma; `standaard` is het model uit `~/.codex/config.toml` |
| `AIFLOW_COPILOT_MODEL` | `auto` | model van het Copilot-programma |
| `AIFLOW_HERMES_MODEL`, `AIFLOW_HERMES_PROVIDER` | `cohere/north-mini-code:free`, `openrouter` | model voor `agent-hermes` |
| `AIFLOW_FALLBACK_MODEL` | `anthropic/claude-haiku-5.5` | reserve bij niets doen; leeg zet de reserve uit |
| `AIFLOW_FALLBACK_PROVIDER` | `openrouter` | provider van de reserve |
| `AIFLOW_KLOON` | `/c/Users/mels1/SCORE2SOUND-agent` | aparte kloon voor de agent; met `--alle` komt `-codex`, `-copilot` of `-hermes` erachter |
| `AIFLOW_STATUS` | `~/.aiflow-status` | map voor de statusbestanden (de mod leest deze) |
| `AIFLOW_HERSTEL` | `2` | hoeveel herstelrondes het script een agent geeft na een fout |
| `AIFLOW_AUTOMERGE` | `exact` | `exact`: het script merget PR's die precies `## Verwacht` zijn en groen; `uit`: Claude beslist altijd |
| `AIFLOW_ACTION` | `aan` | `uit`: bij automatisch mergen niet op de GitHub Action wachten (als Actions niet kan draaien); de eigen controles van het script tellen dan |

De prefix `AIFLOW_` en de map `~/.aiflow-status` komen uit de bron van deze werkwijze. Ze blijven zo, zodat scripts en mod op elkaar blijven passen.

## 9. Veiligheid en afspraken
- Een agent merget nooit en pusht nooit naar `main`. Branch protection op `main` hoort aan te staan.
- Geen tokens, sleutels of wachtwoorden in de repo of in een chat. Inloggen doet Mels zelf in een eigen terminal.
- Installeer geen community-skills of plugins zonder ze helemaal te lezen.
- Is een taak onduidelijk of klopt hij niet met de code, dan stopt de agent en meldt het. Gokken is niet toegestaan.

## 10. Nachtplan
Een nachtplan loopt tot een eindtijd (standaard 07:00, eindcontrole 45 minuten eerder). Is het plan af, dan pakt Claude het volgende punt uit `werkpakketten/voorraad.md`. Start, lus, verboden en eindcontrole staan in de skill `.claude/skills/nachtplan/SKILL.md`.
