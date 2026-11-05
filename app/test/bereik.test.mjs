import test from 'node:test';
import assert from 'node:assert/strict';
import { controleerBereik } from '../src/controle/bereik.mjs';

const noot = (stap, octaaf) => ({
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1,
  toonhoogte: { stap, alter: 0, octaaf }, akkoord: false,
});

test('een noot buiten het bereik van de tuba geeft een melding', () => {
  const partituur = {
    partijen: [{
      id: 'P1',
      naam: 'Tuba',
      instrument: { midiProgramma: 58, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: [
        { nummer: '1', index: 0, elementen: [noot('C', 7)] },
        { nummer: '2', index: 1, elementen: [noot('F', 2)] },
      ],
    }],
  };

  assert.deepEqual(controleerBereik(partituur), [{
    soort: 'bereik',
    ernst: 'waarschuwing',
    partij: 'P1',
    maat: 0,
    tekst: 'Maat 1: C7 is te hoog voor Tuba.',
  }]);
});
