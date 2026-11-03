import test from 'node:test';
import assert from 'node:assert/strict';
import importeer from '../src/server/importeer.mjs';

const verzoek = (partNaam, creditWords = '') => ({
  methode: 'POST',
  body: Buffer.from(`<score-partwise>
    <part-list><score-part id="P1"><part-name>${partNaam}</part-name></score-part></part-list>
    ${creditWords ? `<credit><credit-words>${creditWords}</credit-words></credit>` : ''}
    <part id="P1"><measure number="1"/></part>
  </score-partwise>`),
});

test('een credit-words instrumentnaam vult een generieke partijnaam aan', async () => {
  const uit = await importeer(verzoek('MusicXML Part', 'Flugelhorn 2'));
  const partij = uit.body.partituur.partijen[0];
  assert.equal(uit.status, 200);
  assert.equal(partij.naam, 'Flugelhorn 2');
  assert.equal(partij.instrument.midiProgramma, 56);
  assert.deepEqual(partij.instrument.transpositie, { chromatisch: -2, diatonisch: -1 });
});

test('een echte partijnaam blijft behouden', async () => {
  const uit = await importeer(verzoek('Tuba', 'Flugelhorn 2'));
  assert.equal(uit.body.partituur.partijen[0].naam, 'Tuba');
});

test('zonder credit-words blijft de oorspronkelijke partijnaam behouden', async () => {
  const uit = await importeer(verzoek('MusicXML Part'));
  assert.equal(uit.body.partituur.partijen[0].naam, 'MusicXML Part');
});
