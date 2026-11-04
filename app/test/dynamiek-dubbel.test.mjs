import test from 'node:test';
import assert from 'node:assert/strict';
import { voegDynamiekenSamen } from '../src/model/aanduidingen.mjs';

const dynamiek = (start, waarde, zekerheid) => ({
  soort: 'aanwijzing', start, type: 'dynamiek', waarde, zekerheid,
});

const maat = (index, elementen) => ({
  nummer: String(index + 1), index, elementen,
});

test('dynamiek op vrijwel dezelfde plek wordt één teken of de zekerste keuze', () => {
  const partituur = {
    versie: 1,
    titel: 'Dubbele dynamiek',
    componist: '',
    partijen: [{
      id: 'P1',
      naam: 'Bugel',
      maten: [
        maat(0, [dynamiek(0, 'f', 0.9), dynamiek(30, 'p', 0.8)]),
        maat(1, [dynamiek(0, 'f', 0.6), dynamiek(20, 'p', 0.7), dynamiek(40, 'pp', 0.95)]),
      ],
    }],
  };

  const { partituur: uit, meldingen } = voegDynamiekenSamen(partituur);
  const tekens = uit.partijen[0].maten.map((m) => m.elementen.map((e) => e.waarde));

  assert.deepEqual(tekens, [['fp'], ['pp']]);
  assert.equal(uit.partijen[0].maten[0].elementen[0].start, 0);
  assert.deepEqual(meldingen, [{
    soort: 'herkenning',
    ernst: 'waarschuwing',
    partij: 'P1',
    maat: 1,
    tekst: 'Maat 2: f, p en pp stonden op dezelfde plek; pp is behouden.',
  }]);
  assert.equal(partituur.partijen[0].maten[0].elementen.length, 2, 'de invoer verandert niet');
});
