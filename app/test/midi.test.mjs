import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

// Leest een standaard MIDI-bestand terug, ook met running status, naar sporen met events op absolute tikken.
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

// Noten van een spoor als [tik, 'aan'|'uit', toets]; note-on met snelheid 0 telt als uit.
function noten(spoor) {
  return spoor
    .filter((e) => e.soort === 0x90 || e.soort === 0x80)
    .map((e) => [e.tik, e.soort === 0x90 && e.twee > 0 ? 'aan' : 'uit', e.een]);
}

const noot = (start, duur, stap, octaaf, extra = {}) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap, alter: 0, octaaf }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1, ...extra,
});
const rust = (start, duur) => ({ soort: 'rust', start, duur, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 });
const maat = (index, elementen, extra = {}) => ({
  nummer: String(index), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen, ...extra,
});

// Bugel in Bes (klinkt een grote seconde lager) met een opmaat en een overbinding, en een tuba met een akkoord.
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

test('kop: formaat 1, een dirigentenspoor plus een spoor per partij, 480 tikken per kwart', () => {
  const { kop, sporen } = leesMidi(schrijfMidi(partituur));
  assert.deepEqual(kop, { formaat: 1, aantal: 3, deling: 480 });
  assert.equal(sporen.length, 3);
  for (const spoor of sporen) assert.deepEqual(spoor.at(-1).data, [], 'elk spoor eindigt met end-of-track');
  for (const spoor of sporen) assert.equal(spoor.at(-1).meta, 0x2f);
});

test('dirigentenspoor: tempo uit de eerste maat en de maatsoort', () => {
  const { sporen } = leesMidi(schrijfMidi(partituur));
  const tempo = sporen[0].find((e) => e.meta === 0x51);
  assert.equal(tempo.tik, 0);
  assert.deepEqual(tempo.data, [0x09, 0x27, 0xc0], '100 kwarten per minuut is 600000 microseconden');
  const maatsoort = sporen[0].find((e) => e.meta === 0x58);
  assert.deepEqual(maatsoort.data.slice(0, 2), [4, 2], '4/4');
});

test('zonder tempo in de partituur is het 120', () => {
  const zonder = structuredClone(partituur);
  zonder.partijen[0].maten[0].tempo = null;
  const { sporen } = leesMidi(schrijfMidi(zonder));
  assert.deepEqual(sporen[0].find((e) => e.meta === 0x51).data, [0x07, 0xa1, 0x20]);
});

test('partijspoor: naam, instrument en volume op een eigen kanaal', () => {
  const { sporen } = leesMidi(schrijfMidi(partituur, { volume: { P2: 64 } }));
  const naam = sporen[1].find((e) => e.meta === 0x03);
  assert.equal(String.fromCharCode(...naam.data), 'Bugel');
  assert.deepEqual(sporen[1].filter((e) => e.soort === 0xc0).map((e) => [e.kanaal, e.een]), [[0, 56]]);
  assert.deepEqual(sporen[2].filter((e) => e.soort === 0xc0).map((e) => [e.kanaal, e.een]), [[1, 58]]);
  const volume = (spoor) => spoor.filter((e) => e.soort === 0xb0 && e.een === 7).map((e) => e.twee);
  assert.deepEqual(volume(sporen[1]), [100], 'standaardvolume 100');
  assert.deepEqual(volume(sporen[2]), [64]);
});

test('noten: klinkende toonhoogte, opmaat, overbinding en akkoord op de juiste tikken', () => {
  const { sporen } = leesMidi(schrijfMidi(partituur));
  // Bugel: genoteerd D4, E4, D5 klinkt als C4 (60), D4 (62), C5 (72). De overbonden D5 klinkt als één noot.
  assert.deepEqual(noten(sporen[1]), [
    [0, 'aan', 60], [480, 'uit', 60],
    [480, 'aan', 62], [960, 'uit', 62],
    [960, 'aan', 72], [2880, 'uit', 72],
  ]);
  // Tuba: maat 1 begint na de opmaat van 480 tikken, maat 2 op 480 + 1920.
  const tuba = noten(sporen[2]);
  assert.deepEqual(tuba.slice(0, 2), [[480, 'aan', 48], [2400, 'uit', 48]]);
  assert.deepEqual(tuba.slice(2).sort((a, b) => a[0] - b[0] || a[2] - b[2]), [
    [2400, 'aan', 48], [2400, 'aan', 52], [3360, 'uit', 48], [3360, 'uit', 52],
  ]);
});

test('bij een gelijk tijdstip komt noot-uit voor noot-aan', () => {
  const { sporen } = leesMidi(schrijfMidi(partituur));
  const op480 = sporen[1].filter((e) => e.tik === 480 && (e.soort === 0x80 || e.soort === 0x90));
  assert.deepEqual(op480.map((e) => (e.soort === 0x90 && e.twee > 0 ? 'aan' : 'uit')), ['uit', 'aan']);
});

test('geeft een Uint8Array', () => {
  assert.ok(schrijfMidi(partituur) instanceof Uint8Array);
});
