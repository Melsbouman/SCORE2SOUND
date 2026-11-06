import test from 'node:test';
import assert from 'node:assert/strict';
import { maatTijden } from '../src/midi/tijdlijn.mjs';

const maat = (index) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  tempo: index === 0 ? 120 : index === 2 ? 60 : null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [],
});

test('maattijden veranderen mee met een tempowissel', () => {
  const partituur = {
    versie: 1,
    titel: 'Tempowissel',
    componist: '',
    partijen: [{
      id: 'P1',
      naam: 'Piano',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: Array.from({ length: 4 }, (_, index) => maat(index)),
    }],
  };

  assert.deepEqual(maatTijden(partituur), [0, 2, 4, 8]);
});
