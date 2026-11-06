import test from 'node:test';
import assert from 'node:assert/strict';
import { maakNetjes } from '../src/server/herken.mjs';

const noot = {
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
};

function partij(id, naam) {
  return {
    id, naam, afkorting: '', instrument: { midiProgramma: 73, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{
      nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: 96,
      herhaling: { begin: false, eind: false, keer: 2 }, elementen: [structuredClone(noot)],
    }],
  };
}

function partituur() {
  return {
    versie: 1, titel: 'Stuk', componist: '',
    partijen: [partij('P1', 'Fluit'), partij('P2', 'Hobo')],
  };
}

const credit12 = [{ tekst: '12', type: null, pagina: 0, x: 100, y: 500 }];

test('een credit 12 voegt in elke partij dezelfde beginrust toe', () => {
  const stuk = partituur();

  maakNetjes(stuk, '', credit12);

  assert.equal(stuk.partijen[0].maten[0].maatrust, 12);
  assert.equal(stuk.partijen[1].maten[0].maatrust, 12);
});

test('een bestaande beginrust 12 wordt niet nog eens toegepast', () => {
  const stuk = partituur();
  maakNetjes(stuk, '', credit12);
  const verwachteMaten = structuredClone(stuk.partijen.map((huidigePartij) => huidigePartij.maten));

  maakNetjes(stuk, '', credit12);

  assert.deepEqual(stuk.partijen.map((huidigePartij) => huidigePartij.maten), verwachteMaten);
});
