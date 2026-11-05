import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const partituur = {
  partijen: ['P1', 'P2'].map((id) => ({
    id,
    naam: id,
    instrument: { midiProgramma: 0 },
    maten: [],
  })),
};

test('verbergt een partij in de MusicXML-weergave', () => {
  const xml = naarMusicXML(partituur, { weergave: true, verberg: ['P2'] });

  const partijIds = [...xml.matchAll(/<(?:score-part|part) id="([^"]+)"/g)]
    .map(([, id]) => id);
  assert.deepEqual(partijIds, ['P1', 'P1']);
});
