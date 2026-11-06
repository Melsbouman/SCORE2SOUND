import test from 'node:test';
import assert from 'node:assert/strict';
import { klikGebeurtenissen } from '../src/midi/klik.mjs';

const maat = (index) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 6, noemer: 8 },
  toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [],
  tempo: index === 0 ? 120 : null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [],
});

const partituur = {
  versie: 1,
  titel: 'Klik in 6/8',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'Piano',
    afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [maat(0), maat(1)],
  }],
};

test('twee maten in 6/8 geven zes klikken per maat met voorinteller twee', () => {
  const klikken = klikGebeurtenissen(partituur, { voorinteller: 2 });
  const voorinteller = klikken.filter((klik) => klik.tik < 0);
  const muziek = klikken.filter((klik) => klik.tik >= 0);

  assert.equal(voorinteller.length, 12);
  assert.deepEqual(voorinteller.map((klik) => klik.tik), Array.from({ length: 12 }, (_, index) => -2880 + index * 240));
  assert.equal(muziek.length, 12);
  assert.deepEqual(muziek.map((klik) => klik.tik), Array.from({ length: 12 }, (_, index) => index * 240));
  assert.deepEqual(muziek.map((klik) => klik.kracht), [110, 80, 80, 80, 80, 80, 110, 80, 80, 80, 80, 80]);
});
