import test from 'node:test';
import assert from 'node:assert/strict';
import { klikGebeurtenissen } from '../src/midi/klik.mjs';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

const noot = (start, duur) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 4 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const maat = (index) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' }, sleutels: [], tempo: index === 0 ? 100 : null,
  herhaling: { begin: false, eind: false, keer: 2 }, elementen: [noot(0, 480)],
});
const partituur = {
  versie: 1, titel: 'Klikproef', componist: '',
  partijen: [{
    id: 'P1', naam: 'Piano', afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [maat(0), maat(1)],
  }],
};

function leesMidi(bytes) {
  const b = Uint8Array.from(bytes);
  const u32 = (i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const sporen = [];
  let i = 8 + u32(4);
  while (i < b.length) {
    const einde = i + 8 + u32(i + 4);
    let p = i + 8;
    let tik = 0;
    let status = 0;
    const events = [];
    const vlq = () => { let waarde = 0; let byte; do { byte = b[p++]; waarde = (waarde << 7) | (byte & 0x7f); } while (byte & 0x80); return waarde; };
    while (p < einde) {
      tik += vlq();
      if (b[p] & 0x80) status = b[p++];
      if (status === 0xff) {
        p += 1;
        const lengte = vlq();
        p += lengte;
        status = 0;
      } else {
        const soort = status & 0xf0;
        const kanaal = status & 0x0f;
        const toets = b[p++];
        const kracht = soort === 0xc0 || soort === 0xd0 ? null : b[p++];
        events.push({ tik, soort, kanaal, toets, kracht });
      }
    }
    sporen.push(events);
    i = einde;
  }
  return sporen;
}

test('twee maten in 4/4 geven acht klikken met een zware eerste tel', () => {
  const klikken = klikGebeurtenissen(partituur);
  assert.equal(klikken.length, 8);
  assert.deepEqual(klikken.map((klik) => klik.kracht), [110, 80, 80, 80, 110, 80, 80, 80]);
  assert.deepEqual(klikken.filter((klik) => klik.kracht === 110).map((klik) => klik.tik), [0, 1920]);
});

test('een voorinteller geeft vier klikken voor het begin en schuift de muziek een maat op', () => {
  const klikken = klikGebeurtenissen(partituur, { voorinteller: 1 });
  assert.deepEqual(klikken.filter((klik) => klik.tik < 0).map((klik) => klik.tik), [-1920, -1440, -960, -480]);
  const sporen = leesMidi(schrijfMidi(partituur, { klik: true, voorinteller: 1 }));
  const eersteNoot = sporen[1].find((event) => event.soort === 0x90 && event.kracht > 0);
  assert.equal(eersteNoot.tik, 1920);
  const klikTikken = sporen.at(-1)
    .filter((event) => event.soort === 0x90 && event.kracht > 0)
    .map((event) => event.tik);
  assert.deepEqual(klikTikken.slice(0, 4), [0, 480, 960, 1440]);
});

test('zonder klik blijven de MIDI-bytes gelijk aan de bestaande aanroep', () => {
  assert.deepEqual(schrijfMidi(partituur, { klik: false, voorinteller: 2 }), schrijfMidi(partituur));
});

test('het klikspoor gebruikt percussiekanaal 9', () => {
  const sporen = leesMidi(schrijfMidi(partituur, { klik: true }));
  const noten = sporen.at(-1).filter((event) => event.soort === 0x90 && event.kracht > 0);
  assert.equal(noten.length, 8);
  assert.ok(noten.every((event) => event.kanaal === 9));
});
