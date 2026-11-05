import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

// Geeft van het laatste spoor de noten: [begin, einde, toets, sterkte].
function noten(bytes) {
  const b = Buffer.from(bytes);
  let i = 14;
  let spoor = [];
  while (i < b.length) {
    const einde = i + 8 + b.readUInt32BE(i + 4);
    spoor = [];
    i += 8;
    let tik = 0;
    const vlq = () => {
      let waarde = 0;
      for (;;) {
        const byte = b[i++];
        waarde = (waarde << 7) | (byte & 0x7f);
        if (byte < 0x80) return waarde;
      }
    };
    while (i < einde) {
      tik += vlq();
      const status = b[i++];
      if (status === 0xff) {
        i += 1;
        const lengte = vlq();
        i += lengte;
      } else if ((status & 0xf0) === 0xc0) {
        i += 1;
      } else {
        spoor.push({ tik, soort: status & 0xf0, toets: b[i], kracht: b[i + 1] });
        i += 2;
      }
    }
  }
  const aan = spoor.filter((e) => e.soort === 0x90 && e.kracht > 0);
  return aan.map((e) => {
    const uit = spoor.find((u) => u.tik > e.tik && u.toets === e.toets && (u.soort === 0x80 || u.kracht === 0));
    return [e.tik, uit.tik, e.toets, e.kracht];
  });
}

const noot = (start, stap, extra = {}) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap, alter: 0, octaaf: 4 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1, ...extra,
});
const dynamiek = (start, waarde) => ({ soort: 'aanwijzing', start, type: 'dynamiek', waarde, zekerheid: 1 });
const maat = (index, elementen) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const partituur = (...maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }],
});

test('zonder dynamiek blijft de sterkte 80', () => {
  assert.deepEqual(noten(schrijfMidi(partituur(maat(0, [noot(0, 'C')])))), [[0, 480, 60, 80]]);
});

test('dynamiek geldt vanaf haar plek en loopt door over de maten', () => {
  const uit = noten(schrijfMidi(partituur(
    maat(0, [dynamiek(0, 'p'), noot(0, 'C'), noot(480, 'D'), dynamiek(960, 'f'), noot(960, 'E')]),
    maat(1, [noot(0, 'F')]),
  )));
  assert.deepEqual(uit.map((n) => n[3]), [55, 55, 95, 95]);
});

test('sf, sfz en fp gelden alleen voor de noot op die plek', () => {
  const uit = noten(schrijfMidi(partituur(maat(0, [dynamiek(0, 'mp'), dynamiek(480, 'sfz'), noot(0, 'C'), noot(480, 'D'), noot(960, 'E')]))));
  assert.deepEqual(uit.map((n) => n[3]), [68, 110, 68]);
});

test('staccato klinkt half zo lang, staccatissimo drie tiende', () => {
  const uit = noten(schrijfMidi(partituur(maat(0, [noot(0, 'C', { articulaties: ['staccato'] }), noot(480, 'D', { articulaties: ['staccatissimo'] }), noot(960, 'E')]))));
  assert.deepEqual(uit.map((n) => n[1] - n[0]), [240, 144, 480]);
});

test('accent en marcato zijn sterker en komen nooit boven 127', () => {
  const uit = noten(schrijfMidi(partituur(maat(0, [
    dynamiek(0, 'fff'),
    noot(0, 'C', { articulaties: ['accent'] }),
    noot(480, 'D', { articulaties: ['marcato'] }),
    noot(960, 'E'),
  ]))));
  assert.deepEqual(uit.map((n) => n[3]), [127, 127, 120]);
  const zacht = noten(schrijfMidi(partituur(maat(0, [noot(0, 'C', { articulaties: ['accent'] }), noot(480, 'D', { articulaties: ['marcato'] })]))));
  assert.deepEqual(zacht.map((n) => n[3]), [100, 99]);
});

test('een staccato noot is korter dan een tenuto noot', () => {
  const uit = noten(schrijfMidi(partituur(maat(0, [
    noot(0, 'C', { articulaties: ['staccato'] }),
    noot(480, 'D', { articulaties: ['tenuto'] }),
  ]))));
  assert.ok(uit[0][1] - uit[0][0] < uit[1][1] - uit[1][0]);
});

test('een accent heeft een hogere velocity dan dezelfde noot zonder accent', () => {
  const gewoon = noten(schrijfMidi(partituur(maat(0, [noot(0, 'C')]))))[0][3];
  const accent = noten(schrijfMidi(partituur(maat(0, [noot(0, 'C', { articulaties: ['accent'] })]))))[0][3];
  assert.ok(accent > gewoon);
});
