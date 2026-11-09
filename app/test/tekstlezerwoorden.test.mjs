import assert from 'node:assert/strict';
import test from 'node:test';

import { woordenNaarMaten } from '../src/model/tekstlezerwoorden.mjs';

function partituurMetMaten() {
  return {
    partijen: [{
      maten: [
        { elementen: [{ soort: 'noot', plek: { blad: 1, x: 100, y: 500 } }] },
        { elementen: [{ soort: 'noot', plek: { blad: 1, x: 400, y: 500 } }] },
      ],
    }],
  };
}

function ocrMetWoord(woord) {
  return [{ blad: 1, regels: [{ woorden: [woord] }] }];
}

test('zet een bekende term bij de horizontaal dichtstbijzijnde maat eronder', () => {
  const uit = woordenNaarMaten(
    partituurMetMaten(),
    ocrMetWoord({ tekst: '  marcato  ', x: 390, y: 400 }),
  );

  assert.deepEqual(uit.partijen[0].maten[1].elementen.at(-1), {
    soort: 'aanwijzing',
    type: 'tekst',
    waarde: 'marcato',
    start: 0,
    zekerheid: 0.6,
  });
});

test('geeft bij ontbrekende OCR een inhoudelijk ongewijzigde kopie terug', () => {
  const partituur = partituurMetMaten();
  const uit = woordenNaarMaten(partituur);

  assert.deepEqual(uit, partituur);
  assert.notStrictEqual(uit, partituur);
  assert.notStrictEqual(uit.partijen[0].maten[0].elementen, partituur.partijen[0].maten[0].elementen);
});

test('negeert onbekende tekst en een bekende term zonder geldige plek', () => {
  const partituur = partituurMetMaten();
  const uit = woordenNaarMaten(partituur, [{
    blad: 1,
    regels: [{
      woorden: [
        { tekst: 'onbekend', x: 100, y: 400 },
        { tekst: 'Marcato', x: Number.NaN, y: 400 },
      ],
    }],
  }]);

  assert.deepEqual(uit, partituur);
});

test('voegt geen bijna gelijke aanwijzing toe als die al in een buurmaat staat', () => {
  const partituur = partituurMetMaten();
  partituur.partijen[0].maten[0].elementen.push({
    soort: 'aanwijzing',
    type: 'tekst',
    tekst: 'marc',
    start: 0,
    zekerheid: 1,
  });

  const uit = woordenNaarMaten(
    partituur,
    ocrMetWoord({ tekst: 'marc.', x: 400, y: 250 }),
  );

  assert.equal(uit.partijen[0].maten[1].elementen.length, 1);
});
