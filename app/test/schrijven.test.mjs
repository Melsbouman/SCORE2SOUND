import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { leesXml, kind, kinderen, tekst, getal } from '../src/musicxml/xml.mjs';

const noot = (start, duur, stap, octaaf, extra = {}) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap, alter: 0, octaaf }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1, ...extra,
});
const rust = (start, duur, extra = {}) => ({ soort: 'rust', start, duur, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1, ...extra });
const aanwijzing = (start, type, waarde) => ({ soort: 'aanwijzing', start, type, waarde, zekerheid: 1 });
const maat = (index, elementen, extra = {}) => ({
  nummer: String(index), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: -1, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen, ...extra,
});

const partituur = {
  versie: 1, titel: 'Mars <1> & meer', componist: 'Componist',
  partijen: [
    {
      id: 'P1', naam: 'Trompet & Bugel', afkorting: 'Tr.', instrument: { midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 } },
      maten: [
        maat(0, [aanwijzing(0, 'tempo', 96), aanwijzing(0, 'dynamiek', 'mf'), noot(0, 480, 'D', 4)], { nummer: '0', opmaat: true, tempo: 96 }),
        maat(1, [
          noot(0, 720, 'F', 4, { toonhoogte: { stap: 'F', alter: 1, octaaf: 4 }, articulaties: ['staccato', 'accent'], legato: { begin: true, eind: false } }),
          noot(720, 240, 'G', 4, { legato: { begin: false, eind: true } }),
          noot(960, 960, 'A', 4, { overbinding: { begin: true, eind: false } }),
          noot(960, 960, 'C', 5, { akkoord: true }),
        ], { herhaling: { begin: true, eind: false, keer: 2 } }),
        maat(2, [
          noot(0, 480, 'A', 4, { overbinding: { begin: false, eind: true } }),
          noot(480, 160, 'B', 4, { toonhoogte: { stap: 'B', alter: -1, octaaf: 4 } }), noot(640, 160, 'C', 5), noot(800, 160, 'D', 5),
          rust(960, 960),
        ], { maatsoort: { teller: 3, noemer: 4 }, herhaling: { begin: false, eind: true, keer: 3 } }),
      ],
    },
    {
      id: 'P2', naam: 'Bas', afkorting: '', instrument: { midiProgramma: 57, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: [
        maat(0, [rust(0, 480)], { nummer: '0', opmaat: true, sleutels: [{ teken: 'F', lijn: 4, notenbalk: 1, octaafVerschuiving: 0 }] }),
        maat(1, [noot(0, 1920, 'C', 3), noot(0, 960, 'G', 2, { stem: 2 }), noot(960, 960, 'E', 2, { stem: 2 })], { sleutels: [{ teken: 'F', lijn: 4, notenbalk: 1, octaafVerschuiving: 0 }] }),
        maat(2, [rust(0, 1440, { heleMaat: true })], { maatsoort: { teller: 3, noemer: 4 }, sleutels: [{ teken: 'F', lijn: 4, notenbalk: 1, octaafVerschuiving: 0 }] }),
      ],
    },
  ],
};

const xml = naarMusicXML(partituur);
const wortel = leesXml(xml);
const partij = (id) => kinderen(wortel, 'part').find((p) => p.attr.id === id);
const maten = (id) => kinderen(partij(id), 'measure');
const notes = (m) => kinderen(m, 'note');

test('geeft geldige MusicXML 4.0 met titel, componist en de partijenlijst', () => {
  assert.equal(typeof xml, 'string');
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.equal(wortel.attr.version, '4.0');
  assert.equal(tekst(kind(wortel, 'work'), 'work-title'), 'Mars <1> & meer');
  assert.equal(kinderen(kind(wortel, 'identification'), 'creator').find((c) => c.attr.type === 'composer').tekst, 'Componist');
  const delen = kinderen(kind(wortel, 'part-list'), 'score-part');
  assert.deepEqual(delen.map((d) => [d.attr.id, tekst(d, 'part-name'), tekst(d, 'part-abbreviation', '-')]), [['P1', 'Trompet & Bugel', 'Tr.'], ['P2', 'Bas', '-']]);
  assert.equal(getal(kind(delen[0], 'midi-instrument'), 'midi-program'), 57);
});

test('maten met nummer, opmaat en attributen alleen in de eerste maat en bij een wijziging', () => {
  assert.deepEqual(maten('P1').map((m) => [m.attr.number, m.attr.implicit ?? '']), [['0', 'yes'], ['1', ''], ['2', '']]);
  const eerste = kind(maten('P1')[0], 'attributes');
  assert.equal(getal(eerste, 'divisions'), 480);
  assert.deepEqual([getal(kind(eerste, 'key'), 'fifths'), tekst(kind(eerste, 'key'), 'mode')], [-1, 'major']);
  assert.deepEqual([getal(kind(eerste, 'time'), 'beats'), getal(kind(eerste, 'time'), 'beat-type')], [4, 4]);
  assert.deepEqual([tekst(kind(eerste, 'clef'), 'sign'), getal(kind(eerste, 'clef'), 'line')], ['G', 2]);
  assert.deepEqual([getal(kind(eerste, 'transpose'), 'diatonic'), getal(kind(eerste, 'transpose'), 'chromatic')], [-1, -2]);
  assert.equal(kind(maten('P1')[1], 'attributes'), null, 'maat 1 verandert niets');
  const derde = kind(maten('P1')[2], 'attributes');
  assert.deepEqual([getal(kind(derde, 'time'), 'beats'), getal(kind(derde, 'time'), 'beat-type')], [3, 4]);
  assert.equal(kind(derde, 'key'), null, 'alleen wat verandert');
  assert.equal(kind(kind(maten('P2')[0], 'attributes'), 'transpose'), null, 'geen transpose voor een instrument in C');
  assert.equal(tekst(kind(kind(maten('P2')[0], 'attributes'), 'clef'), 'sign'), 'F');
});

test('noten met toonhoogte, duur, type, punten, triool en akkoord', () => {
  const [fis, g, a, c] = notes(maten('P1')[1]);
  assert.deepEqual([tekst(kind(fis, 'pitch'), 'step'), getal(kind(fis, 'pitch'), 'alter'), getal(kind(fis, 'pitch'), 'octave')], ['F', 1, 4]);
  assert.equal(getal(fis, 'duration'), 720);
  assert.equal(tekst(fis, 'type'), 'quarter');
  assert.equal(kinderen(fis, 'dot').length, 1);
  assert.equal(getal(kind(g, 'pitch'), 'alter'), null, 'geen alter bij 0');
  assert.equal(tekst(g, 'type'), 'eighth');
  assert.equal(tekst(a, 'type'), 'half');
  assert.equal(kind(a, 'chord'), null);
  assert.ok(kind(c, 'chord'), 'de C5 is een akkoordnoot');
  const triool = notes(maten('P1')[2])[1];
  assert.equal(getal(triool, 'duration'), 160);
  assert.equal(tekst(triool, 'type'), 'eighth');
  assert.deepEqual([getal(kind(triool, 'time-modification'), 'actual-notes'), getal(kind(triool, 'time-modification'), 'normal-notes')], [3, 2]);
  assert.equal(getal(kind(triool, 'pitch'), 'alter'), -1);
});

test('rusten, ook een hele-maatrust zonder type', () => {
  const r = notes(maten('P1')[2]).at(-1);
  assert.ok(kind(r, 'rest'));
  assert.equal(getal(r, 'duration'), 960);
  assert.equal(tekst(r, 'type'), 'half');
  const heel = notes(maten('P2')[2])[0];
  assert.equal(kind(heel, 'rest').attr.measure, 'yes');
  assert.equal(getal(heel, 'duration'), 1440);
  assert.equal(kind(heel, 'type'), null);
});

test('twee stemmen: eerst stem 1, dan backup, dan stem 2', () => {
  const m = maten('P2')[1];
  assert.deepEqual(kinderen(m).filter((k) => k.naam === 'note' || k.naam === 'backup').map((k) => (k.naam === 'backup' ? `backup ${getal(k, 'duration')}` : `${tekst(kind(k, 'pitch'), 'step')}${getal(kind(k, 'pitch'), 'octave')} stem ${getal(k, 'voice')}`)), [
    'C3 stem 1', 'backup 1920', 'G2 stem 2', 'E2 stem 2',
  ]);
});

test('overbinding, legato, articulaties en herhalingen', () => {
  const [fis, g, a] = notes(maten('P1')[1]);
  assert.deepEqual(kinderen(kind(kind(fis, 'notations'), 'articulations')).map((k) => k.naam), ['staccato', 'accent']);
  assert.equal(kind(kind(fis, 'notations'), 'slur').attr.type, 'start');
  assert.equal(kind(kind(g, 'notations'), 'slur').attr.type, 'stop');
  assert.equal(kind(a, 'tie').attr.type, 'start');
  assert.equal(kind(kind(a, 'notations'), 'tied').attr.type, 'start');
  assert.equal(kind(notes(maten('P1')[2])[0], 'tie').attr.type, 'stop');
  const links = kinderen(maten('P1')[1], 'barline').find((b) => b.attr.location === 'left');
  assert.equal(kind(links, 'repeat').attr.direction, 'forward');
  const rechts = kinderen(maten('P1')[2], 'barline').find((b) => b.attr.location === 'right');
  assert.deepEqual([kind(rechts, 'repeat').attr.direction, kind(rechts, 'repeat').attr.times], ['backward', '3']);
});

test('aanwijzingen: tempo als metronoom met sound, dynamiek, en het tempo maar één keer', () => {
  const richtingen = kinderen(maten('P1')[0], 'direction');
  const metronomen = richtingen.filter((r) => kind(kind(r, 'direction-type'), 'metronome'));
  assert.equal(metronomen.length, 1);
  assert.equal(getal(kind(kind(metronomen[0], 'direction-type'), 'metronome'), 'per-minute'), 96);
  assert.equal(kind(metronomen[0], 'sound').attr.tempo, '96');
  const dyn = richtingen.find((r) => kind(kind(r, 'direction-type'), 'dynamics'));
  assert.equal(kinderen(kind(kind(dyn, 'direction-type'), 'dynamics'))[0].naam, 'mf');
});
