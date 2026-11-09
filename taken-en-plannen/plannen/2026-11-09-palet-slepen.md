# Slepen uit het palet en dynamiek op een noot (9 november 2026)

## Idee
Mels wil een betere animatie bij het slepen van icoontjes uit het palet, en dynamiek (ff, mf, ...), cresc. en dim. op een losse noot kunnen zetten, niet alleen aan een hele maat.

## Wat er nu is (9 nov)
- Slepen gaat met de standaard HTML5-sleep van de browser: een vaag beeld van de knop, geen eigen animatie, en op een telefoon of tablet werkt slepen uit het palet niet.
- Een aanwijzing komt alleen bij een noot als je hem binnen 14 pixels van die noot loslaat; anders op tel 1 van de maat, en dan licht de hele maat op. Klikken (eerst een noot kiezen, dan het hokje) zet hem wel bij de noot.
- Een haak (crescendo of decrescendo) loopt bij slepen altijd tot het eind van de maat.
- De weergave tekent een aanwijzing met een start midden in de maat wel op de goede plek (in de browser nagekeken).

## Keuzes
- **Altijd bij een noot.** Een dynamiek, cresc./dim. of haak die in een maat wordt losgelaten, komt bij de noot of rust die horizontaal het dichtst bij de muis staat (op de balk onder de muis). Tijdens het slepen licht die noot op, niet de maat. Alleen een maat zonder noten (een meermaatsrust) blijft tel 1.
- **Haak tot de volgende noot.** Een haak op een noot loopt van die noot tot de volgende noot of rust (zoals in MuseScore); op een gekozen maat of reeks maten blijft hij over de hele maten lopen.
- **Eigen slepen met pointer events.** Een zwevend kaartje met het icoon gaat met de muis of vinger mee (opgetild: iets groter, schaduw), het doel licht zacht pulserend op, bij loslaten krimpt het kaartje het doel in met een korte kring, ernaast loslaten of Escape laat het terugvliegen naar het palet. Met een vinger: opzij bewegen of even vasthouden begint een sleep, omhoog en omlaag schuift het palet. Wie minder beweging wil (systeeminstelling), krijgt geen animaties.
- Ook nieuw bij het nakijken: een maat vangt het teken tot anderhalve balkhoogte erboven of eronder (een dynamiek laat je onder de balk los), en de pagina schuift mee als je naar de rand van het venster sleept.
- Klikken blijft zoals het was. Buiten dit plan: een haak over meer maten slepen (van noot tot noot), en dynamiek bij een tweede notenbalk.

## Pakketten
| Nr | Titel | Bestanden | Uitvoerder | Hangt af van | Golf | Stand |
|---|---|---|---|---|---|---|
| 1 | Haak op een noot loopt tot de volgende noot | `app/src/model/paletactie.mjs`, `app/test/paletactie-haak.test.mjs` | Claude-uitvoerder | – | 1 | klaar (#1856, PR #1858) |
| 2 | ff, cresc. en dim. uit het palet komen altijd bij een noot | `app/src/model/paletdoel.mjs`, `app/test/paletdoel.test.mjs`, `app/public/js/weergave.js`, `app/public/js/views/paletten.js` | Claude-uitvoerder | – | 1 | klaar (#1857, PR #1859) |
| 3 | Eigen slepen met animatie, ook met aanraken | `app/public/js/views/paletsleep.js` (nieuw), `app/public/js/views/paletten.js`, `app/public/js/weergave.js`, `app/public/editor.css` | Claude | 2 | 2 | gebouwd, in de browser nagekeken (1366 en 375 pixels) |

## Tests
- Pakket 1: `paletactie-haak.test.mjs` (haak op een noot, op de laatste noot, op een maat en over gekozen maten; ff en cresc. op de tel van de noot).
- Pakket 2: `paletdoel.test.mjs` (de dichtstbijzijnde noot horizontaal, alleen op de dichtste balk, gelijke afstand, geen kandidaten).
- Pakket 3: een test dat het palet geen HTML5-sleep meer gebruikt en elke knop sleepbaar is via pointer events; verder in de browser nagekeken op 1366 en 375 pixels (muis en aanraken).
