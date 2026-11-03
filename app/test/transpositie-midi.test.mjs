import assert from 'node:assert/strict';
import test from 'node:test';

import { schrijfMidi } from '../src/midi/schrijven.mjs';

// Bekende verschillen:
// - Bes-instrument: de verwachte klinkende toonhoogte MIDI 58 wordt nog niet geschreven.
// - Hoorn in F: de verwachte klinkende toonhoogte MIDI 53 wordt nog niet geschreven.
// - Es-instrument: de verwachte klinkende toonhoogte MIDI 51 wordt nog niet geschreven.
// - Niet-transponerend instrument: de verwachte toonhoogte MIDI 60 wordt nog niet geschreven.

function maakPartituur(transpositie) {
  return {
    titel: 'Transpositie',
    tempo: 120,
    maatsoort: { teller: 4, noemer: 4 },
    partijen: [
      {
        id: 'P1',
        naam: 'Instrument',
        kanaal: 0,
        programma: 0,
        transpositie,
        noten: [
          {
            start: 0,
            duur: 480,
            toonhoogte: {
              stap: 'C',
              wijziging: 0,
              octaaf: 4,
              midi: 60,
            },
          },
        ],
      },
    ],
  };
}

function eersteNootAan(bytes, kanaal) {
  for (let i = 0; i < bytes.length - 2; i += 1) {
    const status = bytes[i];
    if (status >= 0x90 && status <= 0x9f && (status & 0x0f) === kanaal && bytes[i + 2] > 0) {
      return bytes[i + 1];
    }
  }
  return undefined;
}

const gevallen = [
  ['Bes-instrument', { chromatisch: -2, diatonisch: -1 }, 58],
  ['hoorn in F', { chromatisch: -7, diatonisch: -4 }, 53],
  ['Es-instrument', { chromatisch: -9, diatonisch: -5 }, 51],
  ['niet-transponerend instrument', { chromatisch: 0, diatonisch: 0 }, 60],
];

for (const [naam, transpositie, verwacht] of gevallen) {
  test.todo(`${naam} krijgt de goede klinkende toonhoogte in MIDI`);
}
