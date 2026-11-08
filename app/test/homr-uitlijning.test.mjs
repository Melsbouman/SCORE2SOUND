import assert from 'node:assert/strict';
import test from 'node:test';
import { vergelijkMotoren } from '../../automatisering/homr-vergelijk.mjs';

const homrXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1"><note><rest/></note></measure>
    <measure number="2"><note><rest/></note></measure>
    <measure number="3"><note><rest/></note></measure>
    <measure number="4">
      <note><pitch><step>C</step><octave>4</octave></pitch></note>
    </measure>
  </part>
</score-partwise>`;

const partituur = {
  partijen: [{
    maten: [
      { nummer: 1, maatrust: 3, elementen: [{ soort: 'rust' }] },
      { nummer: 2, verborgen: true, elementen: [{ soort: 'rust' }] },
      { nummer: 3, verborgen: true, elementen: [{ soort: 'rust' }] },
      {
        nummer: 4,
        elementen: [{ soort: 'noot', toonhoogte: { stap: 'C', octaaf: 4 } }],
      },
    ],
  }],
};

test('lijnt een noot na een meermaats-rust uit met dezelfde homr-maat', () => {
  const resultaat = vergelijkMotoren(homrXml, partituur);

  assert.equal(resultaat.aantalMatenHomr, 4);
  assert.equal(resultaat.aantalMatenApp, 4);
  assert.equal(resultaat.notenMetGelijkeToonhoogte, 1);
  assert.deepEqual(resultaat.afwijkendeMaten, []);
});
