---
name: nachtplan
description: Voer een nachtplan uit, met een eindtijd in plaats van een eindpunt. Gebruik dit als Mels zegt dat een nachtplan uitgevoerd wordt, of vraagt om "vannacht", "terwijl ik slaap" of "tot morgenochtend" door te werken met de agents.
argument-hint: "[eindtijd, bijvoorbeeld 07:00] [planbestand]"
---

# Nachtplan

Een nachtplan loopt tot een **eindtijd**, niet tot het plan af is. Is het plan af, dan ga je door met de werkvoorraad. Mels kijkt 's ochtends. Je stelt 's nachts geen vragen, want niemand antwoordt.

Verder gelden alle afspraken uit `CLAUDE.md`, `AGENTS.md`, `hermes/WERKWIJZE.md` en `werkpakketten/00-werkwijze.md`.

## 1. Bij de start (voordat Mels gaat slapen)
Loop dit na en meld in één korte lijst wat ontbreekt. Dit is het enige moment waarop je nog iets kunt vragen.
- **Eindtijd:** uit de opdracht. Staat er geen, neem 07:00. De eindcontrole begint 45 minuten eerder (standaard 06:15).
- **Plan:** een `werkpakketten/nacht/SCORE2SOUND-nachtplan-<datum>.md` met werkpakketten, golven (taken in één golf raken nooit dezelfde bestanden) en per pakket wie het doet. Schrijf het plan zelf als Mels alleen wensen geeft.
- **Werkvoorraad:** `werkpakketten/voorraad.md`. Vul hem aan met ideeën uit het plan die niet in de eerste golven passen, en met open punten uit het laatste nachtrapport.
- **Uitvoerders:** controleer dat de uitvoerder werkt (Codex ingelogd, of Copilot actief) en dat de reserve een OpenRouter-sleutel heeft. Een limiet van ChatGPT of Copilot midden in de nacht vangt de reserve op, maar alleen als die werkt.
- **Wakker blijven:** vraag via de ccd_settings-tools om de instelling die de computer wakker houdt aan te zetten (Mels keurt dat goed). Valt de computer in slaap, dan stopt alles.
- **Rechten:** draai je in een modus die om toestemming vraagt, zeg dat dan. Eén vraag om middernacht blokkeert de hele nacht. Stel auto-modus voor, of de skill `fewer-permission-prompts`.
- **Schone start:** `git status` op `main`, geen open issues met `agent-bezig`.
- **Backup:** wordt iets vervangen dat Mels misschien terug wil, maak dan een tag `backup/<naam>` en noteer hoe je het terugzet.

## 2. De lus
Herhaal tot de eindcontrole begint:
1. **Zet een golf klaar.** Schrijf eerst de tests, dan de taken (`hermes/maak-taak.sh`, met `--verwacht` waar het kan). Verdeel ze met `--voor codex|copilot|hermes` en start direct `bash hermes/werkpakketten.sh --alle` op de achtergrond, vanuit `C:\SCORE2SOUND`.
2. **Werk zelf parallel** aan wat te groot of te lastig is voor een agent. Middelgrote taken mogen naar een Claude-subagent (met isolatie in een eigen worktree), maar nooit op bestanden van een lopende golf.
3. **Beoordeel wat overblijft** met `bash hermes/review.sh`, zoals `CLAUDE.md` voorschrijft. Het script heeft de fouten er al uitgefilterd en exacte PR's zelf gemerged. Keur af met korte punten en `agent-terug`, of merge.
4. **Extra controleronde per golf**, omdat er tijd is. Heeft het project een interface:
   - de skill `accessibility-review` op de gewijzigde pagina's
   - `design-critique` op een schermafbeelding
   - de breedtes 768 en 1920 px
   - de stand zonder beweging (`prefers-reduced-motion`)
   Anders: lees de gemergde code van de golf nog een keer als geheel, en zoek naar ontbrekende tests.
5. **Kies het volgende werk.**
   - Eerst wat er nog in het plan staat.
   - Is het plan op, neem dan het bovenste punt uit `werkpakketten/voorraad.md` dat met de regels te doen is.
   - Kom je onderweg iets tegen dat beter kan, zet het dan in de voorraad. Je mag ook zelf functionaliteit verzinnen, als die binnen de afspraken van het project valt.
6. **Wachten:** sta nooit stil. Wacht je op agents, gebruik `ScheduleWakeup` (of `/loop`) met een ruime termijn als vangnet. Ga intussen door met eigen werk of controles. Een achtergrondtaak die klaar is, maakt je vanzelf wakker.

Schrap een pakket als het tegen een projectregel ingaat, of als het niet nodig blijkt. Schrijf de reden op voor het rapport.

## 3. Wat niet mag
- Niet stoppen omdat het plan af is. Alleen de eindtijd, een leeg tegoed of een blokkade die je niet zelf kunt oplossen, stopt de nacht. Schrijf in dat laatste geval het rapport meteen.
- Geen tests draaien in je eigen werkmap die dezelfde poorten of tijdelijke mappen gebruiken als de runner, terwijl de runner loopt. Tegelijk geven ze willekeurige fouten.
- Taken voor Hermes (`--voor hermes`) alleen met `--verwacht`, en alleen mergen bij het label `agent-exact`.
- Geen nieuwe dependencies zonder dat ze in het plan staan, geen tokens of wachtwoorden, niets naar buiten (geen berichten, geen publicatie, geen deploy).
- Niet pushen naar `main` zonder PR.

## 4. Eindcontrole (vanaf eindtijd min 45 minuten)
1. Zet geen nieuwe taken meer klaar. Laat lopende agents afmaken, of zet hun issue terug op `agent-ready` met een notitie.
2. Op `main`: `bash hermes/tests.sh` en de regelcontrole over alles van vannacht (`node hermes/regels-controle.mjs --basis <startcommit> --maxregels 100000`).
3. Heeft het project een interface: bekijk het op 1366 x 800, 1920 x 1080, 768 x 1024, 375 x 812 en 375 x 667, zonder horizontale scroll en zonder consolefouten.
4. Schrijf `werkpakketten/nacht/rapport-<datum>.md`:
   - een samenvatting
   - een tabel per werkpakket (PR, door wie, uitkomst)
   - de eindcontrole
   - eigen keuzes
   - wat opviel aan de werkwijze
   - open punten
   - de start- en eindtijd, en het aantal pakketten per uitvoerder
5. Werk `werkpakketten/voorraad.md` bij (afgevinkt en nieuw). Werk ook je geheugen bij met de lessen van de nacht.
6. Stuur het rapport (en bij een interface voor- en na-beelden) met `SendUserFile` en sluit af met een korte samenvatting voor de ochtend.
