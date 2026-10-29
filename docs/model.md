# Het muziekmodel

Alle onderdelen van SCORE2SOUND werken op dit ene model: inlezen (MusicXML, later de herkenning), controleren, afspelen, transponeren, samenvoegen, bewaren en exporteren. Het model is gewone JSON, zodat de server het kan bewaren en de browser het kan gebruiken. Wijzig dit contract alleen in een eigen taak, en pas dan de tests mee aan.

## Tijd: tikken
Elke tijd en duur is een geheel aantal **tikken**. Een kwartnoot is **480 tikken** (`TIKKEN_PER_KWART` in `app/src/model/duur.mjs`), net als in veel MIDI-bestanden. Zo is een achtste 240, een halve 960, een gepunteerde kwart 720, en een triool-achtste 160.

MusicXML gebruikt `divisions` per maat of partij; bij het inlezen worden die omgerekend naar tikken: `tikken = duration * 480 / divisions`. Komt daar geen geheel getal uit, dan wordt er afgerond en krijgt het element een `zekerheid` van hooguit 0,5.

## Toonhoogte
```js
{ stap: 'C', alter: 0, octaaf: 4 }
```
- `stap`: een van `C D E F G A B`.
- `alter`: `-2` tot `2` (dubbelmol tot dubbelkruis), `0` voor geen voorteken.
- `octaaf`: wetenschappelijke notatie, de centrale C is `C4` (MIDI-nummer 60).

Het model bewaart de **genoteerde** toonhoogte, zoals op het blad. De **klinkende** toonhoogte volgt uit de transpositie van het instrument (zie Partij). Zo blijft een bugelpartij zoals de bugelist hem leest, en klinkt hij toch goed.

## Partituur
```js
{
  versie: 1,
  titel: 'Mars',                 // '' als onbekend
  componist: '',                 // '' als onbekend
  partijen: [Partij, ...],
}
```

## Partij
```js
{
  id: 'P1',                      // uniek binnen de partituur, zoals in MusicXML
  naam: 'Bugel',
  afkorting: 'Bgl.',             // '' als onbekend
  instrument: {
    midiProgramma: 0,            // General MIDI-programma 0 tot 127, 0 als onbekend
    transpositie: { chromatisch: -2, diatonisch: -1 },  // klinkend = genoteerd + chromatisch halve tonen
  },
  maten: [Maat, ...],
}
```
Een instrument in C heeft `{ chromatisch: 0, diatonisch: 0 }`. Een bugel in Bes: `{ chromatisch: -2, diatonisch: -1 }`. Een althoorn in Es: `{ chromatisch: -9, diatonisch: -5 }`.

## Maat
```js
{
  nummer: '1',                   // het maatnummer zoals op het blad (tekst: kan '0' of 'X1' zijn)
  index: 0,                      // plek in de partij, vanaf 0
  opmaat: false,                 // true voor een onvolledige eerste maat (MusicXML implicit="yes")
  maatsoort: { teller: 4, noemer: 4 },   // geldend in deze maat (ook als hij eerder werd gezet)
  toonsoort: { kwinten: 0, modus: 'majeur' }, // geldend; kwinten -7 tot 7 (min = mollen)
  sleutels: [Sleutel, ...],      // geldend, een per notenbalk
  tempo: null,                   // kwartnoten per minuut als hier een tempo begint, anders null
  herhaling: { begin: false, eind: false, keer: 2 },  // herhaalstrepen
  elementen: [Element, ...],     // gesorteerd op start, dan op stem
}
```
`maatsoort`, `toonsoort` en `sleutels` staan in **elke** maat, ook als ze niet veranderen. Dan hoeft geen enkel onderdeel terug te zoeken.

### Sleutel
```js
{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }   // vioolsleutel
{ teken: 'F', lijn: 4, notenbalk: 1, octaafVerschuiving: 0 }   // bassleutel
```

## Element
Elk element heeft:
- `soort`: `'noot'`, `'rust'` of `'aanwijzing'`;
- `start`: tikken vanaf het begin van de maat;
- `zekerheid`: 0 tot 1. Uit een MusicXML-bestand is dat 1; de herkenning geeft lagere waarden waar hij twijfelt. De app toont alles onder 0,8 als onzeker.

### Noot
```js
{
  soort: 'noot',
  start: 0,
  duur: 480,
  stem: 1,                       // stem binnen de partij, vanaf 1
  notenbalk: 1,                  // notenbalk binnen de partij, vanaf 1
  toonhoogte: { stap: 'C', alter: 0, octaaf: 4 },
  akkoord: false,                // true: hoort bij de vorige noot (zelfde start)
  overbinding: { begin: false, eind: false },
  articulaties: [],              // 'staccato', 'accent', 'tenuto', 'marcato', 'staccatissimo'
  legato: { begin: false, eind: false },   // legatoboog
  versiering: null,              // 'triller', 'mordent', 'dubbelslag' of null
  zekerheid: 1,
}
```

### Rust
```js
{ soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 }
```
`heleMaat` is `true` voor een rust die de hele maat vult (in MusicXML `measure="yes"`); de duur is dan de lengte van de maat.

### Aanwijzing
```js
{ soort: 'aanwijzing', start: 0, type: 'dynamiek', waarde: 'mf', zekerheid: 1 }
```
`type` is een van:
- `'dynamiek'`: `waarde` is `ppp` tot `fff`, `sf`, `sfz` of `fp`;
- `'crescendo'` of `'decrescendo'`: `waarde` is `'begin'` of `'eind'`;
- `'tempo'`: `waarde` is kwartnoten per minuut (een getal);
- `'tekst'`: `waarde` is de tekst zelf, zoals `'rit.'` of `'a tempo'`.

## Melding
De controles geven een lijst meldingen:
```js
{
  soort: 'maatduur',             // welke controle: 'maatduur', 'aantal-maten', 'ontbrekende-partij', 'bereik', ...
  ernst: 'fout',                 // 'fout' of 'waarschuwing'
  partij: 'P1',                  // id van de partij, of null als het de hele partituur betreft
  maat: 3,                       // index van de maat, of null
  tekst: 'Maat 4 duurt 3 kwarten, maar de maatsoort 4/4 vraagt er 4.',
}
```
`tekst` is voor de gebruiker: Nederlands, rustig en concreet, en het maatnummer zoals op het blad.

## Project
```js
{
  id: 'a1b2c3',                  // gemaakt door de server: letters en cijfers
  naam: 'Mars',
  aangemaakt: '2026-10-29T20:00:00.000Z',
  bijgewerkt: '2026-10-29T20:00:00.000Z',
  partituur: Partituur,
}
```
