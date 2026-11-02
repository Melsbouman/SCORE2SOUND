import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

function sterktes(bytes) {
  const b = Buffer.from(bytes);
  const uit = [];
  let i = 14;
  while (i < b.length) {
    const einde = i + 8 + b.readUInt32BE(i + 4);
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
        const toets = b[i++];
        const kracht = b[i++];
        if ((status & 0xf0) === 0x90 && kracht > 0) uit.push({ tik, toets, kracht });
      }
    }
  }
  return uit.map((noot) => noot.kracht);
}

const noot = (start, stap) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap, alter: 0, octaaf: 4 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const dynamiek = (start, waarde) => ({ soort: 'aanwijzing', start, type: 'dynamiek', waarde, zekerheid: 1 });
const wig = (start, type, waarde) => ({ soort: 'aanwijzing', start, type, waarde, zekerheid: 1 });
const maat = (index, elementen) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const partituur = (maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }],
});

test('crescendo verhoogt de aanslagsterkte richting de volgende dynamiek', () => {
  const uit = schrijfMidi(partituur([
    maat(0, [dynamiek(0, 'p'), wig(0, 'crescendo', 'begin'), noot(0, 'C')]),
    maat(1, [wig(0, 'crescendo', 'eind'), noot(0, 'D')]),
    maat(2, [dynamiek(0, 'f'), noot(0, 'E')]),
  ]));
  const waarden = sterktes(uit);
  assert.equal(waarden[0], 55);
  assert.ok(waarden[1] >= waarden[0] && waarden[1] <= 95);
  assert.equal(waarden[2], 95);
  assert.ok(waarden.every((waarde, index) => index === 0 || waarde >= waarden[index - 1]));
});

test('decrescendo verlaagt de aanslagsterkte', () => {
  const uit = schrijfMidi(partituur([
    maat(0, [dynamiek(0, 'f'), wig(0, 'decrescendo', 'begin'), noot(0, 'C')]),
    maat(1, [wig(0, 'decrescendo', 'eind'), noot(0, 'D')]),
    maat(2, [dynamiek(0, 'p'), noot(0, 'E')]),
  ]));
  const waarden = sterktes(uit);
  assert.equal(waarden[0], 95);
  assert.ok(waarden[1] <= waarden[0] && waarden[1] >= 55);
  assert.equal(waarden[2], 55);
  assert.ok(waarden.every((waarde, index) => index === 0 || waarde <= waarden[index - 1]));
});

test('zonder wiggen blijven de MIDI-bytes gelijk', () => {
  const maten = [
    maat(0, [dynamiek(0, 'p'), wig(0, 'crescendo', 'begin'), noot(0, 'C')]),
    maat(1, [wig(0, 'crescendo', 'eind'), noot(0, 'D')]),
    maat(2, [dynamiek(0, 'f'), noot(0, 'E')]),
  ];
  const zonderWiggen = structuredClone(maten);
  for (const maatdeel of zonderWiggen) {
    maatdeel.elementen = maatdeel.elementen.filter((element) => element.type !== 'crescendo');
  }
  assert.deepEqual(schrijfMidi(partituur(zonderWiggen)), Uint8Array.from([
    77, 84, 104, 100, 0, 0, 0, 6, 0, 1, 0, 2, 1, 224, 77, 84, 114, 107, 0, 0, 0, 19,
    0, 255, 88, 4, 4, 2, 24, 8, 0, 255, 81, 3, 7, 161, 32, 0, 255, 47, 0, 77, 84, 114,
    107, 0, 0, 0, 45, 0, 255, 3, 1, 65, 0, 192, 0, 0, 176, 7, 100, 0, 144, 60, 55,
    131, 96, 128, 60, 0, 139, 32, 144, 62, 55, 131, 96, 128, 62, 0, 139, 32, 144, 64,
    95, 131, 96, 128, 64, 0, 0, 255, 47, 0,
  ]));
});
