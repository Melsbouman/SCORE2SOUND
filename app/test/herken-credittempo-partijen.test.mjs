import test from 'node:test';
import assert from 'node:assert/strict';
import { maakNetjes } from '../src/server/herken.mjs';
import { tempoLijst } from '../src/model/tempo.mjs';

function partij(id, naam, aantalMaten) {
  return {
    id, naam, afkorting: '', instrument: { midiProgramma: 73, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: Array.from({ length: aantalMaten }, (_, index) => ({
      nummer: String(index + 1), index, maatsoort: { teller: 4, noemer: 4 }, elementen: [],
    })),
  };
}

test('een credit-tempo komt in maat 0 zonder de partijen te veranderen', () => {
  const stuk = {
    versie: 1, titel: 'Stuk', componist: '',
    partijen: [partij('P1', 'Fluit', 2), partij('P2', 'Hobo', 1)],
  };
  const maatlengtes = stuk.partijen.map((huidigePartij) => huidigePartij.maten.length);

  maakNetjes(stuk, '', [{ tekst: 'J = 96', pagina: 0, x: 100, y: 1500 }]);

  assert.deepEqual(tempoLijst(stuk), [{ maat: 0, nummer: '1', bpm: 96 }]);
  assert.deepEqual(stuk.partijen.map((huidigePartij) => huidigePartij.maten.length), maatlengtes);
});
