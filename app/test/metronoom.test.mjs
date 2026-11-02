import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

function musicXML(metronome, sound = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise version="4.0">
      <part-list><score-part id="P1"><part-name>Fluit</part-name>
        <midi-instrument id="P1-I1"><midi-program>1</midi-program></midi-instrument>
      </score-part></part-list>
      <part id="P1"><measure number="1">
        <direction><direction-type>${metronome}</direction-type>${sound}</direction>
      </measure></part>
    </score-partwise>`;
}

function tempo(partituur) {
  return partituur.partijen[0].maten[0].elementen.find((element) => element.type === 'tempo');
}

test('gestippelde kwartnoot bewaart de notatie en het afspeeltempo', () => {
  const eerste = leesMusicXML(musicXML(
    '<metronome><beat-unit>quarter</beat-unit><beat-unit-dot/><per-minute>60</per-minute></metronome>',
    '<sound tempo="90"/>',
  ));
  assert.equal(eerste.partijen[0].maten[0].tempo, 90);
  assert.deepEqual(tempo(eerste).getoond, { eenheid: 'quarter', punt: true, getal: 60 });
  assert.equal(tempo(eerste).waarde, 90);

  const xml = naarMusicXML(eerste);
  assert.match(xml, /<beat-unit>quarter<\/beat-unit><beat-unit-dot\/><per-minute>60<\/per-minute>/);
  assert.match(xml, /<sound tempo="90"\/>/);
  const opnieuw = leesMusicXML(xml);
  assert.deepEqual(tempo(opnieuw).getoond, { eenheid: 'quarter', punt: true, getal: 60 });
  assert.equal(tempo(opnieuw).waarde, 90);
  assert.equal(opnieuw.partijen[0].maten[0].tempo, 90);
});

test('halve noot per minuut wordt omgerekend naar kwartnoten per minuut', () => {
  const partituur = leesMusicXML(musicXML(
    '<metronome><beat-unit>half</beat-unit><per-minute>60</per-minute></metronome>',
  ));
  assert.equal(partituur.partijen[0].maten[0].tempo, 120);
  assert.deepEqual(tempo(partituur).getoond, { eenheid: 'half', punt: false, getal: 60 });
});

test('metronoom zonder punt behoudt de oorspronkelijke eenheid en het getal', () => {
  const eerste = leesMusicXML(musicXML(
    '<metronome><beat-unit>eighth</beat-unit><per-minute>120</per-minute></metronome>',
  ));
  assert.equal(tempo(eerste).waarde, 60);
  assert.deepEqual(tempo(eerste).getoond, { eenheid: 'eighth', punt: false, getal: 120 });

  const opnieuw = leesMusicXML(naarMusicXML(eerste));
  assert.deepEqual(tempo(opnieuw).getoond, { eenheid: 'eighth', punt: false, getal: 120 });
  assert.equal(tempo(opnieuw).waarde, 60);
});

test('sound-tempo zonder metronoom heeft geen getoonde notatie', () => {
  const partituur = leesMusicXML(musicXML('', '<sound tempo="90"/>'));
  assert.equal(tempo(partituur).waarde, 90);
  assert.equal('getoond' in tempo(partituur), false);
});

test('tempo-aanwijzing zonder getoond gebruikt kwartnoten en de waarde', () => {
  const partituur = {
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
        tempo: 90,
        herhaling: { begin: false, eind: false, keer: 2 },
        elementen: [{ soort: 'aanwijzing', start: 0, type: 'tempo', waarde: 90, zekerheid: 1 }],
      }],
    }],
  };
  const xml = naarMusicXML(partituur);
  assert.match(xml, /<beat-unit>quarter<\/beat-unit><per-minute>90<\/per-minute>/);
  assert.match(xml, /<sound tempo="90"\/>/);
});
