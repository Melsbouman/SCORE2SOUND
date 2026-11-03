import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const maakPartij = (id, naam) => ({
  id,
  naam,
  afkorting: '',
  instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
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
});

const partituur = {
  versie: 1,
  partijen: [maakPartij('P1', 'Naam P1'), maakPartij('P2', 'Naam P2')],
};

test('MusicXML-weergave verbergt gekozen partijen', () => {
  const xml = naarMusicXML(partituur, { weergave: true, verberg: ['P2'] });

  assert.ok(xml.includes('Naam P1'));
  assert.ok(!xml.includes('Naam P2'));
});
