# Nachtplan 8 op 9 november 2026

- Start 21:37, eindtijd 07:00, eindcontrole vanaf 06:15. Startcommit `2ae0143`.
- Doel (Mels): volle focus op een werkende scanner, met de uitkomst als concept in de editor; daarnaast uitgebreid onderzoek naar open-source onderdelen die we kunnen gebruiken.
- Leidraad: `plannen/2026-11-08-scanner.md`. Een verbetering telt pas als de scanmeting (`node automatisering/scanmeting.mjs`) het laat zien.
- Uitvoerders: Claude-uitvoerder (Pro-account, `--voor claude`) voor lastige taken; Gemini voor middelgroot; Hermes alleen klein met `--verwacht`. Codex en Copilot hebben geen tegoed.

## Golf A (nu)
| Pakket | Wie | Bestanden |
|---|---|---|
| A1 Meermaatsrust: het cijfer boven een rustmaat (Windows OCR) wordt het aantal maten; maten krijgen hun plek op het blad | Claude-uitvoerder, code eerst door Claude getest | `app/src/server/omr.mjs`, nieuw `app/src/model/meermaatsrust.mjs`, `app/src/server/herken.mjs`, tests |
| A2 Testrender in brass-stijl: meermaatsrust als balk (`multiRestStyle: 'block'`) | Hermes, `--verwacht` | `app/src/export/pdf.mjs` |
| A3 Onderzoek open source (OMR, OCR, testmateriaal, meten, klank) | Claude-subagent, rapport | `taken-en-plannen/onderzoek/2026-11-08-open-source.md` |

## Golf B
| Pakket | Wie | Bestanden |
|---|---|---|
| B1 Conceptstand: gescande partituur opent als concept met balk "Nog nakijken: n onzekere noten, m meldingen" en knop "Klaar met nakijken" | Claude-uitvoerder | editor-scherm, project/model |
| B2 `herstelHerkenning` op de server, met meting voor en na | Claude-uitvoerder (na A1, zelfde bestand) | `app/src/server/herken.mjs` |
| B3 `echte-controle.sh` toont de echte Audiveris-fout | Gemini | `automatisering/echte-controle.sh` |
| B4 Echte testset: publiek-domein brass- en harmoniepartijen als referentie | Claude zelf (zoeken, licentie nagaan, downloaden buiten het repo) | `taken-en-plannen/meting/testset.json` |

## Golf C
- Gericht verbeteren op de verschillen uit de meting (duren, ontbrekende maten, tempo's midden in het stuk, voorslagen), en wat het onderzoek oplevert.

## Werkvoorraad
`taken-en-plannen/voorraad.md`, sectie Herkenning en Fase 1.
