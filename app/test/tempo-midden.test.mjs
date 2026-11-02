import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

function tempiDirigentenspoor(bytes) {
  const data = Uint8Array.from(bytes);
  const lengte = (plek) => ((data[plek] << 24) | (data[plek + 1] << 16) | (data[plek + 2] << 8) | data[plek + 3]) >>> 0;
  const spoorBegin = 14;
  let plek = spoorBegin + 8;
  const einde = plek + lengte(spoorBegin + 4);
  let tik = 0;
  const tempi = [];
  const vlq = () => {
    let waarde = 0;
    let byte;
    do {
      byte = data[plek++];
      waarde = (waarde << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return waarde;
  };

  while (plek < einde) {
    tik += vlq();
    const status = data[plek++];
    if (status !== 0xff) throw new Error('Onverwacht event in het dirigentenspoor.');
    const type = data[plek++];
    const aantal = vlq();
    const inhoud = [...data.slice(plek, plek + aantal)];
    plek += aantal;
    if (type === 0x51) {
      tempi.push({ tik, microseconden: (inhoud[0] << 16) | (inhoud[1] << 8) | inhoud[2] });
    }
  }
  return tempi;
}

const maat = (index, extra = {}) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  tempo: null,
  elementen: [],
  ...extra,
});

test('tempoaanwijzing midden in de maat wordt als tempo-event geschreven', () => {
  const partituur = {
    partijen: [{
      id: 'P1',
      naam: 'Piano',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0 } },
      maten: [
        maat(0, {
          tempo: 120,
          elementen: [{ soort: 'aanwijzing', start: 960, type: 'tempo', waarde: 60, zekerheid: 1 }],
        }),
        maat(1),
      ],
    }],
  };

  assert.deepEqual(tempiDirigentenspoor(schrijfMidi(partituur)), [
    { tik: 0, microseconden: 500000 },
    { tik: 960, microseconden: 1000000 },
  ]);
});
