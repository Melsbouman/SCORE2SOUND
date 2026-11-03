import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { leesXml, kind, kinderen } from '../src/musicxml/xml.mjs';

const aanwijzing = (start, waarde) => ({ soort: 'aanwijzing', start, type: 'tekst', waarde, zekerheid: 1 });
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
const partituur = (elementen) => ({
  versie: 1,
  titel: '',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'Piano',
    afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [maat(elementen)],
  }],
});

test('dynamiektekst met punt, spaties of hoofdletters wordt als dynamiek geschreven', () => {
  const xml = naarMusicXML(partituur([
    aanwijzing(0, 'mf.'),
    aanwijzing(480, ' MP '),
    aanwijzing(960, 'F'),
  ]));
  const wortel = leesXml(xml);
  const richtingen = kinderen(kind(wortel, 'part'), 'measure').flatMap((m) => kinderen(m, 'direction'));
  const typen = richtingen.map((richting) => kind(richting, 'direction-type'));

  assert.deepEqual(typen.map((type) => kinderen(kind(type, 'dynamics'))[0].naam), ['mf', 'mp', 'f']);
  assert.equal(typen.some((type) => kind(type, 'words')), false);
});
