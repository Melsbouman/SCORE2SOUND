import test from 'node:test';
import assert from 'node:assert/strict';

import { schrijfMidi } from '../src/midi/schrijven.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

test('schrijft een partij zonder noten', () => {
  const partituur = {
    partijen: [
      {
        id: 'P1',
        naam: 'Piano',
        afkorting: 'Pno.',
        instrument: {
          naam: 'Piano',
          midiProgramma: 1,
        },
        maten: [
          {
            nummer: 1,
            start: 0,
            duur: 1920,
            maatsoort: { teller: 4, noemer: 4 },
            toonsoort: { kwinten: 0, modus: 'majeur' },
            sleutels: [],
            elementen: [],
          },
        ],
      },
    ],
  };

  const midi = schrijfMidi(partituur);
  assert.ok(midi instanceof Uint8Array || Buffer.isBuffer(midi));
  assert.ok(midi.length > 0);

  const musicxml = naarMusicXML(partituur);
  assert.equal(typeof musicxml, 'string');
  assert.match(musicxml, /<part\b/);
});
