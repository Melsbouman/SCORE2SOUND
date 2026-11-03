import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const partituur = {
  versie: 1,
  titel: '',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'Zang',
    afkorting: 'Voice',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [],
  }],
};

test('de weergave verbergt de partijafkorting en de export behoudt hem', () => {
  const weergave = naarMusicXML(partituur, { weergave: true });
  const exportbestand = naarMusicXML(partituur);

  assert.match(weergave, /<part-abbreviation-display print-object="no"\/>/);
  assert.doesNotMatch(weergave, /<part-abbreviation>/);
  assert.match(exportbestand, /<part-abbreviation>Voice<\/part-abbreviation>/);
});

test('de Verovio-opties gebruiken rustige afstanden', async () => {
  const bron = await readFile(new URL('../public/js/weergave.js', import.meta.url), 'utf8');

  for (const regel of [
    'spacingStaff: 10',
    'spacingSystem: 12',
    'spacingLinear: 0.25',
    'spacingNonLinear: 0.6',
    'pageMarginTop: 60',
    'minLastJustification: 0',
  ]) assert.ok(bron.includes(regel));
});
