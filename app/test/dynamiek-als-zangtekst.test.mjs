import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const partituur = (teksten) => ({
  versie: 1, titel: 'T', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
      elementen: [{ soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
        overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1, teksten }] }] }],
});

test('een zangtekst die een dynamiekteken is, wordt een dynamiek onder de balk en geen lyric', () => {
  for (const teken of ['mf', 'MF', 'mp', 'f', 'pp', 'mf.']) {
    const xml = naarMusicXML(partituur([{ couplet: 1, lettergreep: teken, soort: 'single' }]), { weergave: true });
    assert.ok(!xml.includes('<lyric'), `${teken}: geen lyric`);
    assert.match(xml, /<dynamics><(?:mf|mp|f|pp)\/><\/dynamics>/, teken);
    assert.match(xml.split('<direction ').find((deel) => deel.includes('<dynamics>')), /placement="below"/);
  }
});

test('een gewone zangtekst blijft een lyric', () => {
  const xml = naarMusicXML(partituur([{ couplet: 1, lettergreep: 'Zin', soort: 'single' }]), { weergave: true });
  assert.ok(xml.includes('<lyric'));
  assert.ok(xml.includes('<text>Zin</text>'));
  assert.ok(!xml.includes('<dynamics>'));
});
