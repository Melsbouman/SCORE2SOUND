# Nachtplan 29 op 30 oktober 2026

Eindtijd 07:00, eindcontrole vanaf 06:15. Rapport in `werkpakketten/nacht/rapport-2026-10-30.md`.

## Wat vannacht gebeurt
Fase 1 van `werkpakketten/plannen/2026-10-29-score2sound-app.md`, golf voor golf. Pakketnummers en uitvoerders staan daar.

| Golf | Pakketten | Wie |
|---|---|---|
| 0 | 0 skelet, model, voorbeelden, lege modules, projectregels | Claude |
| 1 | 1 toonhoogte, 2 duur (Codex); 3 basispagina (Copilot); 4 woordenlijst (Hermes) | agents, Claude beoordeelt |
| 2 | 5 en 6 MusicXML lezen, 7 maatduur (Codex); 8 uploaden (Copilot) | agents |
| 3 | 9 API, 10 MIDI (Codex); 12 meldingen (Copilot); 11 Verovio-koppeling | agents en Claude |
| 4 | 15 MusicXML schrijven, 16 bewaren (Codex); 14 mixer (Copilot); 13 speler | agents en Claude |
| 5 | 17 export, 18 projectenlijst (Copilot); 19 eindcontrole fase 1 | agents en Claude |

Is fase 1 af voor 06:15, dan het bovenste punt uit `werkpakketten/voorraad.md`, of de pakketten van fase 3 die geen Audiveris nodig hebben (partijen eruit halen, transponeren).

## Afspraken voor vannacht
- Tests horen bij het pakket: de taak bevat de exacte testcode die Claude schreef. Zo staan er op `main` alleen tests die slagen.
- Niets naar buiten, geen nieuwe bibliotheken buiten de drie uit het plan.
- Startcommit voor de eindcontrole: de commit van `main` na de merge van pakket 0.
