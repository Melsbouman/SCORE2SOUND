import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

const partituur = {
  versie: 1,
  titel: 'Maten vooraf',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'Piano',
    afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [0, 1].map((index) => ({
      nummer: String(index + 1),
      index,
      opmaat: false,
      maatsoort: { teller: 4, noemer: 4 },
      toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [],
      tempo: index === 0 ? 120 : null,
      herhaling: { begin: false, eind: false, keer: 2 },
      elementen: [{
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
      }],
    })),
  }],
};

function leesSporen(bytes) {
  const b = Uint8Array.from(bytes);
  const lees32 = (i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const sporen = [];
  let i = 8 + lees32(4);
  while (i < b.length) {
    const einde = i + 8 + lees32(i + 4);
    let positie = i + 8;
    let tik = 0;
    let status = 0;
    const events = [];
    const leesVlq = () => {
      let waarde = 0;
      let byte;
      do {
        byte = b[positie++];
        waarde = (waarde << 7) | (byte & 0x7f);
      } while (byte & 0x80);
      return waarde;
    };
    while (positie < einde) {
      tik += leesVlq();
      if (b[positie] & 0x80) status = b[positie++];
      if (status === 0xff) {
        positie += 1;
        const lengte = leesVlq();
        positie += lengte;
        status = 0;
      } else {
        const soort = status & 0xf0;
        const kanaal = status & 0x0f;
        const toets = b[positie++];
        const kracht = soort === 0xc0 || soort === 0xd0 ? null : b[positie++];
        events.push({ tik, soort, kanaal, toets, kracht });
      }
    }
    sporen.push(events);
    i = einde;
  }
  return sporen;
}

test('twee maten vooraf geven acht tikken vóór het stuk, ook zonder metronoom', () => {
  const sporen = leesSporen(schrijfMidi(partituur, { klik: false, voorinteller: 2 }));
  const klikken = sporen.flat().filter((event) => event.soort === 0x90 && event.kanaal === 9 && event.kracht > 0);
  const eersteNoot = sporen[1].find((event) => event.soort === 0x90 && event.kracht > 0);

  assert.equal(klikken.length, 8);
  assert.ok(klikken.every((event) => event.tik < eersteNoot.tik));
});

test('zonder maten vooraf zijn er geen tikken als de metronoom uitstaat', () => {
  const sporen = leesSporen(schrijfMidi(partituur, { klik: false, voorinteller: 0 }));
  const klikken = sporen.flat().filter((event) => event.soort === 0x90 && event.kanaal === 9 && event.kracht > 0);

  assert.equal(klikken.length, 0);
});
