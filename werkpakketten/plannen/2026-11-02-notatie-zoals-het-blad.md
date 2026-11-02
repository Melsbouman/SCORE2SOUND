# Plan: de notatie zoals het blad

Stand: 2 november 2026, op verzoek van Mels na het bekijken van *A Time for Peace* naast het origineel.

## Idee
De herkende partij lijkt nog niet genoeg op het blad. Mels miste: gebonden achtsten (waardestrepen), triolen, de letters in kaders (A, B, C) en fermates.

## Bevindingen
Gemeten met de echte Audiveris op *A Time for Peace* (bugel III) en *Apatheia* (flugelhorn 3):
- **Waardestrepen, triolen en fermates leest Audiveris wel** (Apatheia: 507 `<beam>`, 12 notenkoppen met `time-modification`, 20 `<fermata>`). Onze app gooide ze weg bij het inlezen: het model kende ze niet, dus Verovio tekende elke achtste los met een vlaggetje. Dat is de oorzaak, geen herkenningsfout.
- **Repetitieletters leest Audiveris niet:** `<rehearsal>` komt in geen enkel bestand voor, en de kader (afgeronde rechthoek) is geen muziekteken. Soms leest hij de letter wel als los woord (`[E]`, bij Apatheia ook de getallen 104, 114 enzovoort), meestal niet.

## Keuzes
- **Model uitgebreid** met `balk`, `tuplet` en `fermate` op noten en rusten, en de aanwijzing `letter`. De velden staan er alleen als ze op het blad staan, zodat bestaande bestanden niet veranderen. Zie `docs/model.md`.
- **Een triool krijgt haakje en getal 3.** Heeft het bestand geen begin en eind, dan begint hij bij de eerste noot en eindigt bij de laatste.
- **Waardestreep alleen bij achtsten en korter**, ook als de duur later is gewijzigd: zo blijft er na corrigeren geen kapotte streep staan.
- **Letters zoeken we zelf in het bladbeeld** (`BINARY.png`): een hol, ongeveer vierkant kader waarvan de vier zijden zwart zijn en waar iets in staat. Op *A Time for Peace* vindt dat precies A, B, C en D, op de juiste maat (7, 10, 23 en 25). De letter komt uit het woord dat Audiveris erin vond; anders volgt hij het alfabet (A, dan B, enzovoort), met zekerheid 0,5 en een melding "de letter is aangenomen". De maat is die waarvan de maatstreep het dichtst bij het midden van het kader ligt.
- **Letters komen in elke partij** op dezelfde maat, zodat een uitgenomen partij ze ook heeft.
- **Fermate speelt de speler nog niet langer;** hij wordt alleen getekend en bewaard. Langer spelen is een eigen punt in de voorraad.
- **"Deel 1: ..." en andere tekst** blijft staan zoals het nu is: Audiveris leest zulke tekst als `words` en de app tekent die al (zoals "Andante con espress."). Mels' bedoeling bij dit punt is niet helemaal duidelijk; staat dat nog niet goed, dan komt er een voorbeeld.

## Pakketten
| Golf | Pakket | Bestanden | Uitvoerder | Issue |
|---|---|---|---|---|
| 1 | Waardestrepen, triolen, fermates en letters in het bestand | `src/musicxml/*.mjs`, `docs/model.md` | Codex | |
| 2 | Letters in kaders vinden in de herkenning | `src/server/letters.mjs`, `herken.mjs` | Codex | |

Golf 2 wacht op #148 (dezelfde `herken.mjs`).

## Tests
`notatie-details.test.mjs` (lezen en schrijven, ook heen en terug) en `letters.test.mjs` (een gemaakt PNG-plaatje met kaders: vinden, lege kaders en vlekken overslaan, de maat kiezen, het alfabet volgen over bladen heen). Vooraf gedraaid met alle bestaande tests. Daarna controleert Claude een keer met de echte partijen naast het origineel.
