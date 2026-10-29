import test from 'node:test';
import assert from 'node:assert/strict';
import { leesXml, kind, kinderen } from '../src/musicxml/xml.mjs';
import { leesAttributen, leesRichting, leesNotaties, leesMaatstreep } from '../src/musicxml/aanwijzingen.mjs';

// Het eerste element in een maat, gelezen met de XML-hulp.
function eerste(xml) {
  const wortel = leesXml(`<score-partwise version="4.0"><part id="P1"><measure number="1">${xml}</measure></part></score-partwise>`);
  return kinderen(kind(kind(wortel, 'part'), 'measure'))[0];
}

test('leesAttributen: begint met de standaardwaarden en neemt over wat er staat', () => {
  const stand = leesAttributen(eerste(`<attributes>
    <divisions>4</divisions>
    <key><fifths>-3</fifths><mode>minor</mode></key>
    <time><beats>6</beats><beat-type>8</beat-type></time>
    <clef><sign>F</sign><line>4</line></clef>
    <transpose><diatonic>-5</diatonic><chromatic>-9</chromatic></transpose>
  </attributes>`), null);
  assert.deepEqual(stand, {
    deelwaarden: 4,
    maatsoort: { teller: 6, noemer: 8 },
    toonsoort: { kwinten: -3, modus: 'mineur' },
    sleutels: [{ teken: 'F', lijn: 4, notenbalk: 1, octaafVerschuiving: 0 }],
    transpositie: { chromatisch: -9, diatonisch: -5 },
  });
});

test('leesAttributen: zonder vorige stand gelden 4/4, C-groot, vioolsleutel en geen transpositie', () => {
  assert.deepEqual(leesAttributen(eerste('<attributes><divisions>2</divisions></attributes>'), null), {
    deelwaarden: 2,
    maatsoort: { teller: 4, noemer: 4 },
    toonsoort: { kwinten: 0, modus: 'majeur' },
    sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }],
    transpositie: { chromatisch: 0, diatonisch: 0 },
  });
});

test('leesAttributen: houdt de vorige stand en verandert alleen wat er staat', () => {
  const vorige = leesAttributen(eerste('<attributes><divisions>2</divisions><key><fifths>2</fifths></key></attributes>'), null);
  const nieuw = leesAttributen(eerste('<attributes><time><beats>3+2</beats><beat-type>8</beat-type></time></attributes>'), vorige);
  assert.equal(nieuw.deelwaarden, 2);
  assert.deepEqual(nieuw.toonsoort, { kwinten: 2, modus: 'majeur' });
  assert.deepEqual(nieuw.maatsoort, { teller: 5, noemer: 8 });
  assert.notEqual(nieuw, vorige, 'geeft een nieuw object');
  assert.deepEqual(vorige.maatsoort, { teller: 4, noemer: 4 }, 'verandert de vorige stand niet');
});

test('leesAttributen: twee notenbalken en een octaafsleutel', () => {
  const stand = leesAttributen(eerste(`<attributes>
    <staves>2</staves>
    <clef number="1"><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>
    <clef number="2"><sign>F</sign><line>4</line></clef>
  </attributes>`), null);
  assert.deepEqual(stand.sleutels, [
    { teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: -1 },
    { teken: 'F', lijn: 4, notenbalk: 2, octaafVerschuiving: 0 },
  ]);
});

test('leesRichting: dynamiek, tempo en tekst', () => {
  const dyn = leesRichting(eerste('<direction><direction-type><dynamics><mf/></dynamics></direction-type></direction>'), 240);
  assert.deepEqual(dyn, { aanwijzingen: [{ soort: 'aanwijzing', start: 240, type: 'dynamiek', waarde: 'mf', zekerheid: 1 }], tempo: null });

  const tempo = leesRichting(eerste(`<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>100</per-minute></metronome></direction-type><sound tempo="96"/></direction>`), 0);
  assert.equal(tempo.tempo, 96, 'sound tempo gaat voor de metronoom');
  assert.deepEqual(tempo.aanwijzingen, [{ soort: 'aanwijzing', start: 0, type: 'tempo', waarde: 96, zekerheid: 1 }]);

  const metronoom = leesRichting(eerste('<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type></direction>'), 0);
  assert.equal(metronoom.tempo, 72);

  const halve = leesRichting(eerste('<direction><direction-type><metronome><beat-unit>half</beat-unit><per-minute>60</per-minute></metronome></direction-type></direction>'), 0);
  assert.equal(halve.tempo, 120, 'omgerekend naar kwartnoten per minuut');

  const woorden = leesRichting(eerste('<direction><direction-type><words>rit.</words></direction-type></direction>'), 960);
  assert.deepEqual(woorden.aanwijzingen, [{ soort: 'aanwijzing', start: 960, type: 'tekst', waarde: 'rit.', zekerheid: 1 }]);
});

test('leesRichting: crescendo en decrescendo', () => {
  const cresc = leesRichting(eerste('<direction><direction-type><wedge type="crescendo"/></direction-type></direction>'), 0);
  assert.deepEqual(cresc.aanwijzingen, [{ soort: 'aanwijzing', start: 0, type: 'crescendo', waarde: 'begin', zekerheid: 1 }]);
  const decresc = leesRichting(eerste('<direction><direction-type><wedge type="diminuendo"/></direction-type></direction>'), 0);
  assert.equal(decresc.aanwijzingen[0].type, 'decrescendo');
  const eind = leesRichting(eerste('<direction><direction-type><wedge type="stop"/></direction-type></direction>'), 480, 'decrescendo');
  assert.deepEqual(eind.aanwijzingen, [{ soort: 'aanwijzing', start: 480, type: 'decrescendo', waarde: 'eind', zekerheid: 1 }]);
});

test('leesNotaties: articulaties, legato, versiering en overbinding', () => {
  const noot = eerste(`<note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><tie type="start"/>
    <notations><tied type="start"/><slur type="start" number="1"/>
      <articulations><staccato/><accent/><strong-accent/></articulations>
      <ornaments><trill-mark/></ornaments></notations></note>`);
  assert.deepEqual(leesNotaties(noot), {
    articulaties: ['staccato', 'accent', 'marcato'],
    legato: { begin: true, eind: false },
    versiering: 'triller',
    overbinding: { begin: true, eind: false },
  });
});

test('leesNotaties: een kale noot heeft niets', () => {
  const noot = eerste('<note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration></note>');
  assert.deepEqual(leesNotaties(noot), {
    articulaties: [],
    legato: { begin: false, eind: false },
    versiering: null,
    overbinding: { begin: false, eind: false },
  });
});

test('leesMaatstreep: herhaalstrepen', () => {
  assert.deepEqual(leesMaatstreep(eerste('<barline location="left"><repeat direction="forward"/></barline>')), { begin: true, eind: false, keer: 2 });
  assert.deepEqual(leesMaatstreep(eerste('<barline location="right"><repeat direction="backward" times="3"/></barline>')), { begin: false, eind: true, keer: 3 });
  assert.deepEqual(leesMaatstreep(eerste('<barline location="right"><bar-style>light-heavy</bar-style></barline>')), { begin: false, eind: false, keer: 2 });
});
