import test from 'node:test';
import assert from 'node:assert/strict';
import { maakNetjes } from '../src/server/herken.mjs';

function partituur(tempo = null) {
  const elementen = tempo == null ? [] : [{ soort: 'aanwijzing', start: 0, type: 'tempo', waarde: tempo, zekerheid: 1 }];
  return {
    titel: 'Galop',
    componist: '',
    partijen: [{
      naam: 'Bugel',
      instrument: { midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 } },
      maten: [{ tempo, maatsoort: { teller: 4, noemer: 4 }, elementen }],
    }],
  };
}

test('een credit-tempo bovenaan pagina 0 wordt tempo in maat 0', () => {
  const stuk = partituur();

  maakNetjes(stuk, '', [{ tekst: 'J = 96', pagina: 0, x: 100, y: 1500 }]);

  assert.equal(stuk.partijen[0].maten[0].tempo, 96);
});

test('een bestaand tempo blijft ongewijzigd', () => {
  const stuk = partituur(120);

  maakNetjes(stuk, '', [{ tekst: 'J = 96', pagina: 0, x: 100, y: 1500 }]);

  assert.equal(stuk.partijen[0].maten[0].tempo, 120);
});

test('een los getal geeft geen tempo', () => {
  const stuk = partituur();

  maakNetjes(stuk, '', [{ tekst: '12', pagina: 0, x: 100, y: 1500 }]);

  assert.equal(stuk.partijen[0].maten[0].tempo, null);
});
