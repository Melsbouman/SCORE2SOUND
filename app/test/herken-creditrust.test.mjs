import test from 'node:test';
import assert from 'node:assert/strict';
import { maakNetjes } from '../src/server/herken.mjs';

const noot = {
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
};

function partituur() {
  return {
    versie: 1, titel: 'Stuk', componist: '',
    partijen: [{
      id: 'P1', naam: 'Fluit', afkorting: '', instrument: { midiProgramma: 73, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: [{
        nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
        sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: 96,
        herhaling: { begin: false, eind: false, keer: 2 }, elementen: [structuredClone(noot)],
      }],
    }],
  };
}

test('een credit 12 voegt twaalf rustmaten toe voor de eerste maat met noten', () => {
  const stuk = partituur();

  maakNetjes(stuk, '', [{ tekst: '12', type: null, pagina: 0, x: 100, y: 500 }]);

  assert.equal(stuk.partijen[0].maten.length, 13);
  assert.equal(stuk.partijen[0].maten[0].maatrust, 12);
  assert.equal(stuk.partijen[0].maten.slice(1, 12).filter((maat) => maat.verborgen).length, 11);
  assert.equal(stuk.partijen[0].maten[12].nummer, '13');
  assert.deepEqual(stuk.partijen[0].maten[12].elementen, [noot]);
});

test('zonder credit 12 blijft de partituur ongewijzigd', () => {
  const stuk = partituur();
  const verwachteMaten = structuredClone(stuk.partijen[0].maten);

  maakNetjes(stuk, '', []);

  assert.deepEqual(stuk.partijen[0].maten, verwachteMaten);
});
