import test from 'node:test';
import assert from 'node:assert/strict';
import importeer from '../src/server/importeer.mjs';

const noot = (stap, octaaf, stem, duur = 480) => `
  <note><pitch><step>${stap}</step><octave>${octaaf}</octave></pitch><duration>${duur}</duration><voice>${stem}</voice><type>quarter</type></note>`;
const maat = (nummer, boven, onder) => `
  <measure number="${nummer}">
    ${nummer === 1 ? '<attributes><divisions>480</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>' : ''}
    ${boven}<backup><duration>480</duration></backup>${onder}
  </measure>`;
const partij = (id, maten) => `<part id="${id}">${maten.join('')}</part>`;

test('Audiveris-stemmen met dubbele of hoogstens twee noten verdwijnen, echte tweede stemmen blijven staan', async () => {
  const dubbel = ['C', 'D', 'E'].map((stap, index) => maat(index + 1, noot(stap, 5, 1), noot(['D', 'E', 'F'][index], 5, 2)));
  const kort = [
    maat(1, noot('C', 5, 1), noot('F', 3, 2)),
    maat(2, noot('D', 5, 1), noot('G', 3, 2)),
    maat(3, noot('E', 5, 1), '<forward><duration>480</duration></forward>'),
  ];
  const echt = ['C', 'D', 'E'].map((stap, index) => maat(index + 1, noot(stap, 5, 1), noot(['C', 'B', 'A'][index], 3, 2)));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise version="4.0">
      <identification><encoding><software>Audiveris 5.4</software></encoding></identification>
      <part-list>
        <score-part id="P1"><part-name>Dubbel</part-name></score-part>
        <score-part id="P2"><part-name>Kort</part-name></score-part>
        <score-part id="P3"><part-name>Echt</part-name></score-part>
      </part-list>
      ${partij('P1', dubbel)}${partij('P2', kort)}${partij('P3', echt)}
    </score-partwise>`;

  const uit = await importeer({ methode: 'POST', body: Buffer.from(xml) });
  const stemmen = (partijIndex) => uit.body.partituur.partijen[partijIndex].maten
    .flatMap((item) => item.elementen)
    .filter((element) => element.soort === 'noot')
    .map((element) => element.stem);

  assert.equal(uit.status, 200);
  assert.deepEqual(stemmen(0), [1, 1, 1]);
  assert.deepEqual(stemmen(1), [1, 1, 1]);
  assert.deepEqual(stemmen(2), [1, 2, 1, 2, 1, 2]);
  assert.deepEqual(uit.body.meldingen.filter((melding) => melding.soort === 'herkenning').map((melding) => melding.partij), ['P3']);
});
