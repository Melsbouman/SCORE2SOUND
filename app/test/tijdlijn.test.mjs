import test from 'node:test';
import assert from 'node:assert/strict';
import { maatTijden } from '../src/midi/tijdlijn.mjs';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

const noot = (start, duur, extra = {}) => ({
  soort: 'noot',
  start,
  duur,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 4 },
  articulaties: [],
  overbinding: { begin: false, eind: false },
  ...extra,
});

const maat = (index, elementen = [], extra = {}) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen,
  ...extra,
});

function partituur(maten) {
  return {
    versie: 1,
    titel: 'Tijdlijn',
    componist: '',
    partijen: [{
      id: 'P1',
      naam: 'Piano',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten,
    }],
  };
}

function midiDuur(bytes) {
  const data = Uint8Array.from(bytes);
  const leesGetal = (plek, lengte) => {
    let waarde = 0;
    for (let index = 0; index < lengte; index += 1) waarde = (waarde << 8) | data[plek + index];
    return waarde >>> 0;
  };
  const kopLengte = leesGetal(4, 4);
  const aantalSporen = (data[10] << 8) | data[11];
  let plek = 8 + kopLengte;
  const tempi = [];
  let eindTik = 0;
  for (let spoor = 0; spoor < aantalSporen; spoor += 1) {
    const spoorBegin = plek;
    const spoorEinde = spoorBegin + 8 + leesGetal(spoorBegin + 4, 4);
    plek = spoorBegin + 8;
    let tik = 0;
    while (plek < spoorEinde) {
      let delta = 0;
      let byte;
      do {
        byte = data[plek++];
        delta = (delta << 7) | (byte & 0x7f);
      } while (byte & 0x80);
      tik += delta;
      const status = data[plek++];
      if (status === 0xff) {
        const type = data[plek++];
        let lengte = 0;
        do {
          byte = data[plek++];
          lengte = (lengte << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        if (type === 0x51) {
          tempi.push({
            tik,
            microseconden: (data[plek] << 16) | (data[plek + 1] << 8) | data[plek + 2],
          });
        }
        plek += lengte;
      } else {
        plek += (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? 1 : 2;
      }
    }
    eindTik = Math.max(eindTik, tik);
    plek = spoorEinde;
  }

  let vorigeTik = 0;
  let microseconden = 500000;
  let seconden = 0;
  for (const gebeurtenis of tempi) {
    if (gebeurtenis.tik > eindTik) break;
    seconden += (gebeurtenis.tik - vorigeTik) * microseconden / 480 / 1000000;
    vorigeTik = gebeurtenis.tik;
    microseconden = gebeurtenis.microseconden;
  }
  return {
    eindTik,
    seconden: seconden + (eindTik - vorigeTik) * microseconden / 480 / 1000000,
  };
}

test('vier maten op tempo 120 beginnen om de twee seconden', () => {
  const bron = partituur(Array.from({ length: 4 }, (_, index) => maat(index)));
  bron.partijen[0].maten[0].tempo = 120;
  assert.deepEqual(maatTijden(bron), [0, 2, 4, 6]);
});

test('tempo 60 vanaf maat 3 verlengt alleen de maten erna', () => {
  const bron = partituur(Array.from({ length: 4 }, (_, index) => maat(index)));
  bron.partijen[0].maten[0].tempo = 120;
  bron.partijen[0].maten[2].tempo = 60;
  assert.deepEqual(maatTijden(bron), [0, 2, 4, 8]);
});

test('maatTijden volgt de uitgevouwen herhaling', () => {
  const bron = partituur([
    maat(0, [], { herhaling: { begin: true, eind: false, keer: 2 } }),
    maat(1, [], { herhaling: { begin: false, eind: true, keer: 2 } }),
  ]);
  bron.partijen[0].maten[0].tempo = 120;
  assert.deepEqual(maatTijden(bron), [0, 2, 4, 6]);
});

test('fermate in de laatste maat verlengt de totale MIDI-duur', () => {
  const maten = Array.from({ length: 4 }, (_, index) => maat(index));
  maten[0].tempo = 120;
  maten[3].elementen = [noot(1440, 480, { fermate: true })];
  const bron = partituur(maten);
  const tijden = maatTijden(bron);
  const duur = midiDuur(schrijfMidi(bron));
  const laatsteMaatDuur = (duur.eindTik - 3 * 1920) / 480 * 0.5;

  assert.equal(duur.eindTik, 8160);
  assert.equal(tijden.at(-1) + laatsteMaatDuur, duur.seconden);
});
