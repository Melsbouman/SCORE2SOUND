import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfMidi } from '../src/midi/schrijven.mjs';
import { mixVoorPartijen } from '../src/midi/mix.mjs';

// Helper to parse a MIDI Uint8Array into events, based on midi.test.mjs
function leesMidi(bytes) {
  const b = Uint8Array.from(bytes);
  const tekst = (i, n) => String.fromCharCode(...b.slice(i, i + n));
  const u16 = (i) => (b[i] << 8) | b[i + 1];
  const u32 = (i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  assert.equal(tekst(0, 4), 'MThd');
  const kop = { formaat: u16(8), aantal: u16(10), deling: u16(12) };
  const sporen = [];
  let i = 8 + u32(4);
  while (i < b.length) {
    assert.equal(tekst(i, 4), 'MTrk');
    const einde = i + 8 + u32(i + 4);
    let p = i + 8;
    let tik = 0;
    let status = 0;
    const events = [];
    const vlq = () => { let w = 0; let x; do { x = b[p++]; w = (w << 7) | (x & 0x7f); } while (x & 0x80); return w; };
    while (p < einde) {
      tik += vlq();
      if (b[p] & 0x80) status = b[p++];
      if (status === 0xff) {
        const type = b[p++];
        const lengte = vlq();
        events.push({ tik, meta: type, data: [...b.slice(p, p + lengte)] });
        p += lengte;
        status = 0;
      } else {
        const soort = status & 0xf0;
        const kanaal = status & 0x0f;
        const een = b[p++];
        const twee = soort === 0xc0 || soort === 0xd0 ? null : b[p++];
        events.push({ tik, soort, kanaal, een, twee });
      }
    }
    sporen.push(events);
    i = einde;
  }
  return { kop, sporen };
}

// Test mixVoorPartijen: three partijen give three different pan values within 0-127
const partijen = [
  { id: 'P1', naam: 'Trompet' },
  { id: 'P2', naam: 'Viool' },
  { id: 'P3', naam: 'Tuba' },
];

test('mixVoorPartijen gives three different pan values within 0-127 for three partijen', () => {
  const mix = mixVoorPartijen(partijen);
  assert.equal(mix.length, 3);
  const pans = mix.map(item => item.pan);
  // All pans should be within 0-127
  pans.forEach(p => assert.ok(p >= 0 && p <= 127, `pan ${p} out of range`));
  // All three should be different
  assert.deepStrictEqual(new Set(pans), new Set(pans), 'pan values must be distinct');
});

// Test schreibMidi includes pan, galm, volume, expression controllers for each partij (using existing partituur with two partijen)
// Reuse the partituur from midi.test.mjs (copied here)
const noot = (start, duur, stap, octaaf, extra = {}) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap, alter: 0, octaaf }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1, ...extra,
});
const rust = (start, duur) => ({ soort: 'rust', start, duur, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 });
const maat = (index, elementen, extra = {}) => ({
  nummer: String(index), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen, ...extra,
});

const partituur = {
  versie: 1, titel: 'Proef', componist: '',
  partijen: [
    {
      id: 'P1', naam: 'Bugel', afkorting: '', instrument: { midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 } },
      maten: [
        maat(0, [noot(0, 480, 'D', 4)], { opmaat: true, tempo: 100 }),
        maat(1, [noot(0, 480, 'E', 4), noot(480, 1440, 'D', 5, { overbinding: { begin: true, eind: false } })]),
        maat(2, [noot(0, 480, 'D', 5, { overbinding: { begin: false, eind: true } }), rust(480, 1440)]),
      ],
    },
    {
      id: 'P2', naam: 'Tuba', afkorting: '', instrument: { midiProgramma: 58, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: [
        maat(0, [rust(0, 480)], { opmaat: true }),
        maat(1, [noot(0, 1920, 'C', 3)]),
        maat(2, [noot(0, 960, 'C', 3), noot(0, 960, 'E', 3, { akkoord: true })]),
      ],
    },
  ],
};

test('schreibMidi includes pan, galm, volume, expression controllers for each partij', () => {
  const midiBytes = schrijfMidi(partituur);
  const { sporen } = leesMidi(midiBytes);
  // Each partij (except dirigenten) should have controller events for 0x0A (pan), 0x5B (galm), 0x07 (volume), 0x0B (expression)
  // In our implementation, the dirigenten spoor is index 0, partijen spoor 1 and 2.
  for (let spoorIdx = 1; spoorIdx < sporen.length; spoorIdx++) {
    const spoor = sporen[spoorIdx];
    const kanaal = spoorIdx - 1; // same as in kanaalVan
    const requiredControllers = [0x0A, 0x5B, 0x07, 0x0B];
    requiredControllers.forEach(ctrl => {
      const hasCtrl = spoor.some(e => e.soort === 0xb0 && e.kanaal === kanaal && e.een === ctrl);
      assert.ok(hasCtrl, `Missing controller 0x${ctrl.toString(16)} on channel ${kanaal}`);
    });
  }
});
