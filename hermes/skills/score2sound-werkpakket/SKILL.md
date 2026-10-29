---
name: score2sound-werkpakket
description: Pak één GitHub-issue met het label agent-ready op in de SCORE2SOUND-repo, bouw het op een eigen branch, draai de tests en open een PR. Alleen voor de handmatige route; de gewone route is het runner-script hermes/werkpakket.sh.
---

# SCORE2SOUND werkpakket uitvoeren (handmatig)

Je voert precies één taak tegelijk uit. Claude schrijft de taken en controleert je PR. Jij kiest niets zelf en gokt niet.

## 1. Taak kiezen
1. Controleer of er al een issue met het label `agent-bezig` open staat. Zo ja: stop, doe niets.
2. Haal de oudste open issue met het label `agent-ready` op:
   ```bash
   gh issue list -R Melsbouman/SCORE2SOUND --label agent-ready --state open --json number,title --jq 'sort_by(.number) | .[0]'
   ```
3. Is er geen issue: stop zonder bericht.
4. Claim de taak meteen: label `agent-bezig` toevoegen, `agent-ready` weghalen.
   ```bash
   gh issue edit <nummer> -R Melsbouman/SCORE2SOUND --add-label agent-bezig --remove-label agent-ready
   ```

## 2. Voorbereiden
1. `git checkout main && git pull`.
2. Lees `AGENTS.md` en `werkpakketten/00-werkwijze.md` helemaal. De harde regels daar gelden altijd.
3. Lees het issue helemaal: doel, bestanden, stappen, acceptatiecriteria, "Niet doen" en de bron.
4. Klopt de taak niet met de code, of ontbreekt er iets? Ga naar "Vastgelopen".

## 3. Bouwen
- Maak de branch `agent/<nummer>-<korte-naam>` vanaf `main`.
- Wijzig alleen de bestanden uit het issue. Geen nieuwe dependencies, geen sleutels of tokens.
- Pas geen bestaande tests aan, tenzij het issue dat vraagt.
- Maak kleine commits met een korte Nederlandse omschrijving.

## 4. Controleren
Draai vanuit de hoofdmap van de repo, met de bestanden uit het issue:
```bash
bash hermes/tests.sh pad1 pad2
node hermes/regels-controle.mjs --basis main --toegestaan "pad1,pad2"
```
Faalt een van beide, herstel dan wat er genoemd wordt voor je een PR opent. Zet de uitkomst in de PR.

Loop daarna elk acceptatiecriterium van het issue na. Lukt het niet om de tests te laten slagen binnen de bestanden uit het issue: ga naar "Vastgelopen".

## 5. PR openen
1. Push de branch en open een PR naar `main`. Titel: de titel van het issue.
2. Zet in de beschrijving `Hoort bij #<nummer>`. Gebruik geen `Sluit #<nummer>`: Claude sluit het issue na de controle.
3. Zet er verder in:
   - de letterlijke uitkomst van de tests en de regelcontrole;
   - per gewijzigd bestand één zin wat er veranderde;
   - per acceptatiecriterium of het gehaald is;
   - wat je niet hebt gedaan of waar je twijfelt.
4. Zet de labels op het **issue**, niet op de PR: `agent-bezig` weg, `agent-review` erbij. Controleer daarna met `gh issue view <nummer> --json labels` dat het klopt.
5. Merge nooit zelf. Push nooit naar `main`.

## Vastgelopen
Stop en gok niet. Zet een comment op het issue met: wat je probeerde, wat er misging (letterlijke foutmelding) en wat je nodig hebt. Wissel de labels op het issue: `agent-bezig` weg, `agent-vast` erbij. Laat de branch staan als er al werk op staat.

## Afgekeurde PR
Staat er een open issue met het label `agent-terug`, dan heeft Claude punten gegeven op de PR. Pak die op voor je een nieuwe taak start: werk dezelfde branch bij, los alleen de genoemde punten op, draai de controles opnieuw en wissel het label terug naar `agent-review`.
