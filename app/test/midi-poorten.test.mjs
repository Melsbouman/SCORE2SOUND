import test from 'node:test';
import assert from 'node:assert/strict';
import { kanaalVan, schrijfMidi } from '../src/midi/schrijven.mjs';

// Leest de sporen: per spoor de events { status, data }, met metas als status 0xff.
function leesSporen(bytes) {
  const b = Buffer.from(bytes);
  const sporen = [];
  let i = 14;
  while (i < b.length) {
    const einde = i + 8 + b.readUInt32BE(i + 4);
    const events = [];
    i += 8;
    const vlq = () => {
      let waarde = 0;
      for (;;) {
        const byte = b[i++];
        waarde = (waarde << 7) | (byte & 0x7f);
        if (byte < 0x80) return waarde;
      }
    };
    while (i < einde) {
      vlq();
      const status = b[i++];
      assert.ok(status >= 0x80, 'elk event begint met een statusbyte');
      if (status === 0xff) {
        const soort = b[i++];
        const lengte = vlq();
        events.push({ status, soort, data: [...b.subarray(i, i + lengte)] });
        i += lengte;
      } else {
        const lengte = (status & 0xf0) === 0xc0 ? 1 : 2;
        events.push({ status, data: [...b.subarray(i, i + lengte)] });
        i += lengte;
      }
    }
    sporen.push(events);
  }
  return sporen;
}

const maat = {
  nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' }, sleutels: [],
  tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [{
    soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 4 }, akkoord: false,
    overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
  }],
};
const partituur = (aantal) => ({
  versie: 1, titel: '', componist: '',
  partijen: Array.from({ length: aantal }, (_, index) => ({
    id: `P${index + 1}`, naam: `Partij ${index + 1}`, afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten: [maat],
  })),
});

test('kanaalVan slaat slagwerk over en gaat na 15 partijen naar de volgende poort', () => {
  assert.deepEqual(kanaalVan(0), { poort: 0, kanaal: 0 });
  assert.deepEqual(kanaalVan(8), { poort: 0, kanaal: 8 });
  assert.deepEqual(kanaalVan(9), { poort: 0, kanaal: 10 });
  assert.deepEqual(kanaalVan(14), { poort: 0, kanaal: 15 });
  assert.deepEqual(kanaalVan(15), { poort: 1, kanaal: 0 });
  assert.deepEqual(kanaalVan(24), { poort: 1, kanaal: 10 });
  assert.deepEqual(kanaalVan(30), { poort: 2, kanaal: 0 });
});

test('23 partijen: elk spoor speelt op zijn eigen kanaal en poort', () => {
  const sporen = leesSporen(schrijfMidi(partituur(23)));
  const partijen = sporen.slice(-23);
  partijen.forEach((events, index) => {
    const { poort, kanaal } = kanaalVan(index);
    const noten = events.filter((e) => e.status !== 0xff);
    assert.deepEqual(noten.map((e) => e.status), [0xc0 | kanaal, 0xb0 | kanaal, 0x90 | kanaal, 0x80 | kanaal], `partij ${index + 1}`);
    const poorten = events.filter((e) => e.status === 0xff && e.soort === 0x21);
    assert.deepEqual(poorten.map((e) => e.data), poort === 0 ? [] : [[poort]], `poort van partij ${index + 1}`);
  });
});

test('met 15 partijen of minder staat er geen poort in het bestand', () => {
  const sporen = leesSporen(schrijfMidi(partituur(15)));
  assert.ok(sporen.flat().every((e) => e.soort !== 0x21));
});
