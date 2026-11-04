import assert from 'node:assert/strict';
import test from 'node:test';
import { vergelijkMotoren } from '../../hermes/homr-vergelijk.mjs';

const homrXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <note><pitch><step>C</step><octave>4</octave></pitch></note>
      <note><pitch><step>D</step><octave>4</octave></pitch></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><octave>4</octave></pitch></note>
    </measure>
  </part>
</score-partwise>`;

const partituur = {
  partijen: [{
    maten: [
      {
        nummer: 1,
        elementen: [
          { type: 'noot', toonhoogte: { stap: 'C', octaaf: 4 } },
          { type: 'noot', toonhoogte: { stap: 'D', octaaf: 4 } },
        ],
      },
      {
        nummer: 2,
        elementen: [
          { type: 'noot', toonhoogte: { stap: 'F', octaaf: 4 } },
        ],
      },
    ],
  }],
};

test('vergelijkt notenaantallen en meldt een afwijkende toonhoogte', () => {
  const resultaat = vergelijkMotoren(homrXml, partituur);

  assert.equal(resultaat.aantalMatenHomr, 2);
  assert.equal(resultaat.aantalMatenApp, 2);
  assert.equal(resultaat.matenMetGelijkNotenaantal, 2);
  assert.equal(resultaat.notenMetGelijkeToonhoogte, 2);
  assert.deepEqual(resultaat.afwijkendeMaten, [{
    maatnummer: '2',
    homr: ['E4'],
    app: ['F4'],
  }]);
});
