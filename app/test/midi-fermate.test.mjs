import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

const noot = (start, duur, stap, fermate = false) => ({
  soort: 'noot',
  start,
  duur,
  stem: 1,
  notenbalk: 1,
  toonhoogte: { stap, alter: 0, octaaf: 4 },
  akkoord: false,
  overbinding: { begin: false, eind: false },
  articulaties: [],
  legato: { begin: false, eind: false },
  versiering: null,
  zekerheid: 1,
  ...(fermate ? { fermate: true } : {}),
});

const maat = (index, elementen) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [],
  tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen,
});

const maakPartituur = (fermate) => ({
  versie: 1,
  titel: 'Fermate',
  componist: '',
  partijen: [
    {
      id: 'P1',
      naam: 'Partij 1',
      afkorting: '',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: [
        maat(0, [noot(1440, 480, 'C', fermate)]),
        maat(1, [noot(0, 480, 'D')]),
      ],
    },
    {
      id: 'P2',
      naam: 'Partij 2',
      afkorting: '',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: [
        maat(0, [noot(0, 480, 'G')]),
        maat(1, [noot(0, 480, 'A')]),
      ],
    },
  ],
});

function tikkenVanNoten(bytes) {
  const noten = new Map();
  let positie = 14;
  while (positie < bytes.length) {
    const lengte = (bytes[positie + 4] << 24) | (bytes[positie + 5] << 16)
      | (bytes[positie + 6] << 8) | bytes[positie + 7];
    const einde = positie + 8 + lengte;
    positie += 8;
    let tik = 0;
    while (positie < einde) {
      let delta = 0;
      let byte;
      do {
        byte = bytes[positie++];
        delta = (delta << 7) | (byte & 0x7f);
      } while (byte & 0x80);
      tik += delta;
      const status = bytes[positie++];
      if (status === 0xff) {
        positie += 1;
        let metaLengte = 0;
        do {
          byte = bytes[positie++];
          metaLengte = (metaLengte << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        positie += metaLengte;
        continue;
      }
      const soort = status & 0xf0;
      const toets = bytes[positie++];
      const snelheid = soort === 0xc0 || soort === 0xd0 ? null : bytes[positie++];
      if (soort === 0x90 && snelheid > 0) {
        const starts = noten.get(toets) ?? [];
        starts.push(tik);
        noten.set(toets, starts);
      }
    }
    positie = einde;
  }
  return noten;
}

test('fermate verlengt de maat voor alle partijen gelijk', () => {
  const zonder = tikkenVanNoten(schrijfMidi(maakPartituur(false)));
  const met = tikkenVanNoten(schrijfMidi(maakPartituur(true)));

  assert.equal(zonder.get(62)[0], 1920);
  assert.equal(zonder.get(69)[0], 1920);
  assert.equal(met.get(62)[0], 2304);
  assert.equal(met.get(69)[0], 2304);
});
