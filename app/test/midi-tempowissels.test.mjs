import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

function tempiDirigentenspoor(bytes) {
  const data = Uint8Array.from(bytes);
  const leesLengte = (plek) => ((data[plek] << 24) | (data[plek + 1] << 16) | (data[plek + 2] << 8) | data[plek + 3]) >>> 0;
  const spoorBegin = 14;
  const spoorEinde = spoorBegin + 8 + leesLengte(spoorBegin + 4);
  let plek = spoorBegin + 8;
  let tik = 0;
  const tempi = [];
  const leesVlq = () => {
    let waarde = 0;
    let byte;
    do {
      byte = data[plek++];
      waarde = (waarde << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return waarde;
  };

  while (plek < spoorEinde) {
    tik += leesVlq();
    const status = data[plek++];
    if (status !== 0xff) throw new Error('Onverwacht event in het dirigentenspoor.');
    const type = data[plek++];
    const lengte = leesVlq();
    const inhoud = data.slice(plek, plek + lengte);
    plek += lengte;
    if (type === 0x51) {
      tempi.push({
        tik,
        microseconden: (inhoud[0] << 16) | (inhoud[1] << 8) | inhoud[2],
      });
    }
  }
  return tempi;
}

const maat = (index, tempo) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  tempo,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [],
});

test('MIDI bevat een tempo-event op elke tempowissel', () => {
  const partituur = {
    partijen: [{
      id: 'P1',
      naam: 'Piano',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0 } },
      maten: [maat(0, 120), maat(1, 90), maat(2, 140)],
    }],
  };

  assert.deepEqual(tempiDirigentenspoor(schrijfMidi(partituur)), [
    { tik: 0, microseconden: 500000 },
    { tik: 1920, microseconden: 666667 },
    { tik: 3840, microseconden: 428571 },
  ]);
});
