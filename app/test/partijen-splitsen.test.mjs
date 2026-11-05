import test from 'node:test';
import assert from 'node:assert/strict';
import { splitsPartijenOpKoppen } from '../src/model/partijnaam.mjs';

test('een andere partijnaam op een volgende pagina begint een nieuwe partij', () => {
  const instrument = { midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 } };
  const partituur = {
    partijen: [{
      id: 'P1',
      naam: 'Flugelhorn 1',
      instrument,
      maten: [
        { index: 0, nummer: '1', paginabegin: true },
        { index: 1, nummer: '2' },
        { index: 2, nummer: '3', paginabegin: true },
        { index: 3, nummer: '4' },
      ],
    }],
  };

  const uit = splitsPartijenOpKoppen(partituur, ['Flugelhorn 1', 'Flugelhorn 2']);

  assert.deepEqual(uit.partijen.map(({ naam, instrument: partijInstrument, maten }) => ({
    naam,
    instrument: partijInstrument,
    maten: maten.map(({ index, nummer }) => ({ index, nummer })),
  })), [
    { naam: 'Flugelhorn 1', instrument, maten: [{ index: 0, nummer: '1' }, { index: 1, nummer: '2' }] },
    { naam: 'Flugelhorn 2', instrument, maten: [{ index: 0, nummer: '1' }, { index: 1, nummer: '2' }] },
  ]);
});
