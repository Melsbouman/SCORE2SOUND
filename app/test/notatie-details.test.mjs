import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const noot = (stap, duur, extra = '') => `<note><pitch><step>${stap}</step><octave>4</octave></pitch><duration>${duur}</duration><voice>1</voice>${extra}</note>`;
const stuk = (maat) => `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Bugel</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${maat}</measure></part></score-partwise>`;
const eerste = (xml) => leesMusicXML(xml).partijen[0].maten[0].elementen;

test('balken van achtsten worden gelezen en teruggeschreven', () => {
  const xml = stuk(
    noot('C', 1, '<type>eighth</type><beam number="1">begin</beam>')
    + noot('D', 1, '<type>eighth</type><beam number="1">end</beam>')
    + noot('E', 1, '<type>eighth</type>')
    + noot('F', 1, '<type>eighth</type>')
    + noot('G', 4, '<type>half</type>'),
  );
  const elementen = eerste(xml);
  assert.deepEqual(elementen.map((e) => e.balk ?? null), ['begin', 'eind', null, null, null]);
  const terug = naarMusicXML(leesMusicXML(xml));
  assert.match(terug, /<beam number="1">begin<\/beam>/);
  assert.match(terug, /<beam number="1">end<\/beam>/);
  assert.equal(terug.match(/<beam /g).length, 2);
  assert.deepEqual(eerste(terug).map((e) => e.balk ?? null), ['begin', 'eind', null, null, null]);
});

test('een balk met een noot in het midden', () => {
  const xml = stuk(
    noot('C', 1, '<type>eighth</type><beam number="1">begin</beam>')
    + noot('D', 1, '<type>eighth</type><beam number="1">continue</beam>')
    + noot('E', 1, '<type>eighth</type><beam number="1">end</beam>')
    + noot('F', 5, '<type>half</type><dot/>'),
  );
  assert.deepEqual(eerste(xml).map((e) => e.balk ?? null), ['begin', 'midden', 'eind', null]);
  assert.match(naarMusicXML(leesMusicXML(xml)), /<beam number="1">continue<\/beam>/);
});

test('een triool krijgt begin, eind en het getal 3', () => {
  const tm = '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>';
  const xml = stuk(
    noot('A', 1, `<type>eighth</type>${tm}<notations><tuplet type="start" number="1"/></notations>`)
    + noot('B', 1, `<type>eighth</type>${tm}`)
    + noot('C', 1, `<type>eighth</type>${tm}<notations><tuplet type="stop" number="1"/></notations>`)
    + noot('D', 5, '<type>half</type><dot/>'),
  );
  const [een, twee, drie, vier] = eerste(xml);
  assert.deepEqual(een.tuplet, { aantal: 3, normaal: 2, begin: true, eind: false });
  assert.deepEqual(twee.tuplet, { aantal: 3, normaal: 2, begin: false, eind: false });
  assert.deepEqual(drie.tuplet, { aantal: 3, normaal: 2, begin: false, eind: true });
  assert.equal(vier.tuplet, undefined);
  const terug = naarMusicXML(leesMusicXML(xml));
  assert.match(terug, /<tuplet type="start" number="1" placement="above" bracket="yes"\/>/);
  assert.match(terug, /<tuplet type="stop" number="1"\/>/);
  assert.equal(terug.match(/<time-modification>/g).length, 3);
  assert.deepEqual(eerste(terug).map((e) => e.tuplet ?? null), [een.tuplet, twee.tuplet, drie.tuplet, null]);
});

test('een triool zonder tuplet-markering in het bestand krijgt er een bij het schrijven', () => {
  const tm = '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>';
  const xml = stuk(noot('A', 1, `<type>eighth</type>${tm}`) + noot('B', 1, `<type>eighth</type>${tm}`) + noot('C', 1, `<type>eighth</type>${tm}`) + noot('D', 5, '<type>half</type><dot/>'));
  const terug = naarMusicXML(leesMusicXML(xml));
  assert.match(terug, /<tuplet type="start"/);
  assert.match(terug, /<tuplet type="stop"/);
});

test('een fermate op een noot en op een rust', () => {
  const xml = stuk(
    noot('C', 4, '<type>half</type><notations><fermata type="upright"/></notations>')
    + '<note><rest/><duration>4</duration><voice>1</voice><type>half</type><notations><fermata type="inverted"/></notations></note>',
  );
  const [een, twee] = eerste(xml);
  assert.equal(een.fermate, true);
  assert.equal(twee.fermate, true);
  const terug = naarMusicXML(leesMusicXML(xml));
  assert.equal(terug.match(/<fermata/g).length, 2);
  assert.deepEqual(eerste(terug).map((e) => e.fermate), [true, true]);
});

test('een noot zonder bijzonderheden krijgt geen extra velden', () => {
  const [e] = eerste(stuk(noot('C', 8, '<type>whole</type>')));
  assert.equal('balk' in e, false);
  assert.equal('tuplet' in e, false);
  assert.equal('fermate' in e, false);
});

test('een repetitieletter wordt een aanwijzing en komt terug in het bestand', () => {
  const xml = stuk(
    '<direction placement="above"><direction-type><rehearsal enclosure="square">B</rehearsal></direction-type></direction>'
    + noot('C', 8, '<type>whole</type>'),
  );
  const letter = eerste(xml).find((e) => e.soort === 'aanwijzing');
  assert.deepEqual(letter, { soort: 'aanwijzing', start: 0, type: 'letter', waarde: 'B', zekerheid: 1 });
  const terug = naarMusicXML(leesMusicXML(xml));
  assert.match(terug, /<rehearsal enclosure="square">B<\/rehearsal>/);
  assert.equal(eerste(terug).find((e) => e.type === 'letter').waarde, 'B');
});

test('een aanwijzing met tekst en een letter samen blijven allebei staan', () => {
  const xml = stuk(
    '<direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>'
    + '<direction><direction-type><words>Deel 1: Intro</words></direction-type></direction>'
    + noot('C', 8, '<type>whole</type>'),
  );
  assert.deepEqual(eerste(xml).filter((e) => e.soort === 'aanwijzing').map((e) => [e.type, e.waarde]), [['letter', 'A'], ['tekst', 'Deel 1: Intro']]);
});
