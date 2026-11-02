import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

const noot = (fermate) => ({
  soort: 'noot',
  start: 0,
  duur: 1920,
  stem: 1,
  notenbalk: 1,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 4 },
  akkoord: false,
  overbinding: { begin: false, eind: false },
  articulaties: [],
  legato: { begin: false, eind: false },
  versiering: null,
  zekerheid: 1,
  ...(fermate ? { fermate: true } : {}),
});

const maakPartituur = (fermate) => ({
  versie: 1,
  titel: 'Fermate',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'Piano',
    afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [
      {
        nummer: '1',
        index: 0,
        opmaat: false,
        maatsoort: { teller: 4, noemer: 4 },
        toonsoort: { kwinten: 0, modus: 'majeur' },
        sleutels: [],
        tempo: null,
        herhaling: { begin: false, eind: false, keer: 2 },
        elementen: [noot(fermate)],
      },
      {
        nummer: '2',
        index: 1,
        opmaat: false,
        maatsoort: { teller: 4, noemer: 4 },
        toonsoort: { kwinten: 0, modus: 'majeur' },
        sleutels: [],
        tempo: null,
        herhaling: { begin: false, eind: false, keer: 2 },
        elementen: [],
      },
    ],
  }],
});

function nootUitTik(bytes) {
  const leesGetal = (positie, lengte) => {
    let waarde = 0;
    for (let i = 0; i < lengte; i += 1) waarde = (waarde << 8) | bytes[positie + i];
    return waarde >>> 0;
  };
  let positie = 14;
  const dirigentenLengte = leesGetal(positie + 4, 4);
  positie += 8 + dirigentenLengte;
  const spoorEinde = positie + 8 + leesGetal(positie + 4, 4);
  positie += 8;
  let tik = 0;
  const leesVlq = () => {
    let waarde = 0;
    let byte;
    do {
      byte = bytes[positie++];
      waarde = (waarde << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return waarde;
  };
  while (positie < spoorEinde) {
    tik += leesVlq();
    const status = bytes[positie++];
    if (status === 0xff) {
      positie += 1;
      const lengte = leesVlq();
      positie += lengte;
      continue;
    }
    const soort = status & 0xf0;
    const toets = bytes[positie++];
    const snelheid = soort === 0xc0 || soort === 0xd0 ? null : bytes[positie++];
    if (soort === 0x80 || (soort === 0x90 && snelheid === 0)) return tik;
    if (soort === 0x90 && snelheid > 0) assert.equal(toets, 60);
  }
  assert.fail('Geen noot-uit gebeurtenis gevonden');
}

test('fermate verlengt de noot met precies een nootduur', () => {
  const zonder = schrijfMidi(maakPartituur(false));
  const met = schrijfMidi(maakPartituur(true));
  assert.equal(nootUitTik(met) - nootUitTik(zonder), 1920);
});

test('zonder fermate geeft schrijfMidi bij gelijke partituren dezelfde bytes', () => {
  const partituur = maakPartituur(false);
  assert.deepEqual(schrijfMidi(partituur), schrijfMidi(structuredClone(partituur)));
});
