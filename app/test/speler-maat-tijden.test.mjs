import test from 'node:test';
import assert from 'node:assert/strict';
import { speelVolgorde } from '../src/model/maten.mjs';
import { maatTijden } from '../src/midi/tijdlijn.mjs';

const maat = (index) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  tempo: index === 0 ? 120 : null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [],
});

test('maattijden volgen de uitgespeelde volgorde bij een herhaling', () => {
  const maten = Array.from({ length: 6 }, (_, index) => maat(index));
  maten[1].herhaling.begin = true;
  maten[3].herhaling.eind = true;
  const partituur = {
    versie: 1,
    titel: 'Maatposities',
    componist: '',
    partijen: [{
      id: 'P1',
      naam: 'Piano',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten,
    }],
  };
  const volgorde = speelVolgorde(maten);
  const tijden = maatTijden(partituur);

  assert.deepEqual(volgorde, [0, 1, 2, 3, 1, 2, 3, 4, 5]);
  assert.equal(tijden.length, volgorde.length);
  for (let index = 1; index < tijden.length; index += 1) {
    assert.ok(tijden[index] > tijden[index - 1]);
  }
  assert.ok(tijden[volgorde.indexOf(4)] > tijden[volgorde.lastIndexOf(3)]);
  assert.equal(tijden[volgorde.indexOf(2)], 4);
});
