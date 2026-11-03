import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { leesXml, kind, kinderen } from '../src/musicxml/xml.mjs';
import { volumeOp } from '../src/midi/dynamiek.mjs';

const aanwijzing = (start, type, waarde) => ({ soort: 'aanwijzing', start, type, waarde, zekerheid: 1 });
const maat = (elementen) => ({
  nummer: '1',
  index: 0,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }],
  tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen,
});
const partij = (elementen) => ({
  id: 'P1',
  naam: 'Piano',
  afkorting: '',
  instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
  maten: [maat(elementen)],
});
const partituur = (elementen) => ({ versie: 1, titel: '', componist: '', partijen: [partij(elementen)] });

test('dynamiekwoorden worden MusicXML-dynamiektekens en cresc. blijft cursief als words', () => {
  const xml = naarMusicXML(partituur([
    aanwijzing(0, 'tekst', 'MF'),
    aanwijzing(480, 'tekst', 'cresc.'),
  ]));
  const wortel = leesXml(xml);
  const richtingen = kinderen(kind(wortel, 'part'), 'measure').flatMap((m) => kinderen(m, 'direction'));
  const eerste = kind(kind(richtingen[0], 'direction-type'), 'dynamics');
  assert.equal(kinderen(eerste)[0].naam, 'mf');
  const woorden = kind(kind(richtingen[1], 'direction-type'), 'words');
  assert.equal(woorden.tekst, 'cresc.');
  assert.equal(woorden.attr['font-style'], 'italic');
});

test('volumeOp laat crescendo-tekst stijgen van p naar f en blijft gelijk zonder tekst', () => {
  const metCresc = partij([
    aanwijzing(0, 'dynamiek', 'p'),
    aanwijzing(0, 'tekst', 'cresc.'),
    aanwijzing(1920, 'dynamiek', 'f'),
  ]);
  const zonderCresc = partij([
    aanwijzing(0, 'dynamiek', 'p'),
    aanwijzing(1920, 'dynamiek', 'f'),
  ]);
  assert.ok(volumeOp(metCresc, 960) > volumeOp(metCresc, 0));
  assert.ok(volumeOp(metCresc, 960) < volumeOp(metCresc, 1920));
  assert.equal(volumeOp(zonderCresc, 960), volumeOp(zonderCresc, 0));
});
