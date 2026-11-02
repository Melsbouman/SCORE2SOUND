import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const noot = (start, duur, stap, extra = {}) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1,
  toonhoogte: { stap, alter: 0, octaaf: 4 }, akkoord: false, zekerheid: 1, ...extra,
});

function partituur(elementen) {
  return {
    versie: 1,
    titel: '',
    componist: '',
    partijen: [{
      id: 'P1',
      naam: 'Fluit',
      afkorting: '',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: [{
        nummer: '1',
        index: 0,
        opmaat: false,
        maatsoort: { teller: 4, noemer: 4 },
        toonsoort: { kwinten: 0, modus: 'majeur' },
        sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }],
        tempo: 120,
        herhaling: { begin: false, eind: false, keer: 2 },
        elementen,
      }],
    }],
  };
}

const gewoneNoten = () => [
  noot(0, 480, 'C'),
  noot(480, 480, 'D'),
  noot(960, 480, 'E'),
  noot(1440, 480, 'F'),
];

test('een schuine voorslag staat zonder duration voor de gewone noot', () => {
  const voorslag = noot(0, 0, 'B', { voorslag: { schuin: true } });
  const xml = naarMusicXML(partituur([voorslag, ...gewoneNoten()]));
  const grace = xml.indexOf('<grace slash="yes"/>');
  const eersteGewoneNoot = xml.indexOf('<duration>480</duration>');

  assert.ok(grace >= 0 && grace < eersteGewoneNoot);
  assert.match(xml.slice(grace, eersteGewoneNoot), /<grace slash="yes"\/><pitch><step>B<\/step><octave>4<\/octave><\/pitch><voice>1<\/voice><type>eighth<\/type>/);
  assert.doesNotMatch(xml.slice(grace, eersteGewoneNoot), /<duration>/);

  const opnieuw = leesMusicXML(xml);
  assert.equal(opnieuw.partijen[0].maten[0].elementen.filter((element) => Number.isFinite(element.duur)).reduce((som, element) => som + element.duur, 0), 1920);
});

test('een partituur zonder voorslag houdt dezelfde uitvoer', () => {
  const xml = naarMusicXML(partituur(gewoneNoten()));
  assert.equal(xml, '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Fluit</part-name><midi-instrument id="P1-I1"><midi-program>1</midi-program></midi-instrument></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>480</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>120</per-minute></metronome></direction-type><sound tempo="120"/></direction><note><pitch><step>C</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type></note><note><pitch><step>E</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type></note><note><pitch><step>F</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type></note></measure></part></score-partwise>');
});
