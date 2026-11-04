import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

test('speciale tekens in titel, componist en partijnaam blijven behouden', () => {
  const partituur = {
    versie: 1,
    titel: 'Rock & Roll <live> "2024"',
    componist: 'A & B',
    partijen: [{
      id: 'P1',
      naam: 'Cornet <1>',
      afkorting: '',
      instrument: { midiProgramma: 56, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: [{
        nummer: '1',
        index: 0,
        opmaat: false,
        maatsoort: { teller: 4, noemer: 4 },
        toonsoort: { kwinten: 0, modus: 'majeur' },
        sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }],
        tempo: null,
        herhaling: { begin: false, eind: false, keer: 2 },
        elementen: [],
      }],
    }],
  };

  const xml = naarMusicXML(partituur);
  assert.doesNotMatch(xml, /&(?!amp;|lt;|gt;|quot;|apos;)/);
  assert.doesNotMatch(xml, /<live>/);

  const opnieuw = leesMusicXML(xml);
  assert.equal(opnieuw.titel, partituur.titel);
  assert.equal(opnieuw.componist, partituur.componist);
  assert.equal(opnieuw.partijen[0].naam, partituur.partijen[0].naam);
});
