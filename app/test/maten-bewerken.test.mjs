import test from 'node:test';
import assert from 'node:assert/strict';
import { maatLengte } from '../src/model/duur.mjs';
import { voegMaatToe, verwijderMaat, zetMaatsoort } from '../src/model/maten-bewerken.mjs';

const maakMaat = (index, maatsoort = { teller: 4, noemer: 4 }) => ({
  nummer: String(index + 1), index, maatsoort,
  toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }],
  tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [{ soort: 'rust', start: 0, duur: maatLengte(maatsoort), stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 }],
});
const maakPartituur = () => ({
  partituur: true,
  partijen: [
    { id: 'P1', maten: [maakMaat(0), maakMaat(1)] },
    { id: 'P2', maten: [maakMaat(0), maakMaat(1)] },
  ],
});

test('een toegevoegde maat is een lege maat vol rust in alle partijen en laat het origineel staan', () => {
  const origineel = maakPartituur();
  const nieuw = voegMaatToe(origineel, 0);

  for (const partij of nieuw.partijen) {
    const maat = partij.maten[1];
    assert.equal(maat.index, 1);
    assert.equal(maat.elementen.length, 1);
    assert.equal(maat.elementen[0].soort, 'rust');
    assert.equal(maat.elementen[0].heleMaat, true);
    assert.equal(maat.elementen[0].duur, maatLengte(maat.maatsoort));
    assert.equal(partij.maten[2].index, 2);
  }
  assert.equal(origineel.partijen[0].maten.length, 2);
});

test('een maat verwijderen haalt die uit alle partijen en laat het origineel staan', () => {
  const origineel = maakPartituur();
  const nieuw = verwijderMaat(origineel, 0);

  assert.deepEqual(nieuw.partijen.map((partij) => partij.maten.length), [1, 1]);
  assert.deepEqual(nieuw.partijen.map((partij) => partij.maten[0].index), [0, 0]);
  assert.deepEqual(origineel.partijen.map((partij) => partij.maten.length), [2, 2]);
});

test('een maatsoort wordt vanaf de gekozen maat hersteld naar de nieuwe maatlengte', () => {
  const origineel = maakPartituur();
  const nieuw = zetMaatsoort(origineel, 1, 3, 4);

  for (const partij of nieuw.partijen) {
    const maat = partij.maten[1];
    assert.deepEqual(maat.maatsoort, { teller: 3, noemer: 4 });
    assert.equal(maat.elementen.reduce((langste, element) => (
      Math.max(langste, element.start + element.duur)
    ), 0), maatLengte(maat.maatsoort));
  }
  assert.deepEqual(origineel.partijen[0].maten[1].maatsoort, { teller: 4, noemer: 4 });
});
