import test from 'node:test';
import assert from 'node:assert/strict';
import { maakLeegStuk } from '../src/model/nieuw.mjs';
import { schrijfNoot } from '../src/model/invoeren.mjs';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

function leesNoten(bytes) {
  const midi = Buffer.from(bytes);
  const gebeurtenissen = [];
  let positie = 14;

  while (positie < midi.length) {
    const einde = positie + 8 + midi.readUInt32BE(positie + 4);
    positie += 8;
    let tik = 0;
    const leesVlq = () => {
      let waarde = 0;
      for (;;) {
        const byte = midi[positie++];
        waarde = (waarde << 7) | (byte & 0x7f);
        if (byte < 0x80) return waarde;
      }
    };

    while (positie < einde) {
      tik += leesVlq();
      const status = midi[positie++];
      if (status === 0xff) {
        positie += 1;
        const lengte = leesVlq();
        positie += lengte;
      } else if ((status & 0xf0) === 0xc0) {
        positie += 1;
      } else {
        gebeurtenissen.push({ tik, status: status & 0xf0, toets: midi[positie], snelheid: midi[positie + 1] });
        positie += 2;
      }
    }
  }

  return gebeurtenissen
    .filter((gebeurtenis) => gebeurtenis.status === 0x90 && gebeurtenis.snelheid > 0)
    .map((begin) => {
      const eind = gebeurtenissen.find((gebeurtenis) =>
        gebeurtenis.tik > begin.tik && gebeurtenis.toets === begin.toets && gebeurtenis.status === 0x80);
      return { toets: begin.toets, duur: eind.tik - begin.tik };
    });
}

test('een nieuw geschreven trompetnoot klinkt getransponeerd in MIDI', () => {
  let stuk = maakLeegStuk({ instrumenten: ['trompet'], aantalMaten: 1 });
  stuk = schrijfNoot(stuk, 'P1', 0, 0, 480, { stap: 'C', alter: 0, octaaf: 5 });

  assert.deepEqual(leesNoten(schrijfMidi(stuk)), [{ toets: 70, duur: 480 }]);
});
