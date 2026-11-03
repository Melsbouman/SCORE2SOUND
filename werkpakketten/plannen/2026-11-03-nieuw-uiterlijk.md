# Nieuw uiterlijk van de app (groen, crème en zwart)

## Idee
Mels koos na tien varianten het ontwerp in `ontwerp/score2sound-voorbeeld-11.html` en wil dat de echte app er zo uit gaat zien: donkergroene zijbalk met witte letters, crème werkvlak met groene en zwarte letters, brede vette kopjes (Archivo), pilknoppen, zwarte speler onderaan, een projectenlijst met kleine partituur-miniaturen. Alleen het uiterlijk verandert. Er verandert niets aan wat de app doet.

## Keuzes
- **Alleen opmaak.** De id's in `index.html` (`inloggen`, `upload`, `weergave`, `speler`, ...) en alle `js/`-bestanden blijven zoals ze zijn, behalve de miniatuur in pakket 4. Zo breken de tests en het gedrag niet.
- **Palet:** zijbalk en knoppen `#1c4a14` / `#2b6a1f`, crème `#f0ede1`, wit `#ffffff`, zwart `#0d150b`. Eén uiterlijk, geen donkere variant meer (het ontwerp is bewust één look).
- **Lettertype:** Archivo, zelf meegeleverd (`app/public/fonts/Archivo-latin.woff2`, SIL OFL), geen Google Fonts. Dat is al gedaan.
- **Taal:** de tekst in de app blijft Nederlands. Het ontwerp is Engels, maar de hele app vertalen raakt veel bestanden en tests. Dat staat als open vraag hieronder.
- **Een nieuw bestand `shell.css`** voor zijbalk en speler, zodat de pakketten niet in elkaars `app.css` werken.
- **Buiten dit plan:** de partituur zelf (Verovio) en de editorfuncties.

## Pakketten
| Nr | Titel | Bestanden | Uitvoerder | Hangt af van | Golf | Issue |
|---|---|---|---|---|---|---|
| 1 | Kleuren, lettertype en vorm als tokens | `app/public/app.css` | Copilot | - | 1 | #630 |
| 2 | Zijbalk en vaste speler (shell) | `app/public/index.html`, `app/public/shell.css` | Copilot | 1 | 2 | #631 |
| 3 | Onderdelen in de nieuwe stijl (knoppen, vlakken, kopjes, partituur, speler) | `app/public/app.css`, `app/public/editor.css` | Copilot | 2 | 3 | #632 |
| 4 | Miniatuur van een partituur in de projectenlijst | `app/public/js/miniatuur.js`, `app/public/js/views/projecten.js`, `app/public/app.css` | Codex | - | 1 | #633 |

Test: `app/test/miniatuur.test.mjs` hoort bij pakket 4; de exacte testcode staat in issue 633, zodat er op `main` geen falende test staat. Pakketten 1 tot en met 3 zijn opmaak en worden bekeken in de browser (één keer per golf, 1366 en 375 px breed).

Pakket 4 raakt `app.css` maar alleen onderaan, en wacht vanzelf op pakket 1 als het script dat nodig vindt.

## Open vragen voor Mels
- Moet de hele app Engelstalig worden, ook de knoppen en meldingen? Dat is een apart plan (veel bestanden, tests die tekst controleren). Tot dan blijft alles Nederlands.
- De miniaturen zijn nu een sierplaatje gebaseerd op de titel. Een echte miniatuur van de eerste maten kan later.
