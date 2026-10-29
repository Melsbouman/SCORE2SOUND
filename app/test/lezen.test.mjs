import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';

const lees = async (naam) => leesMusicXML(await readFile(new URL(`./voorbeelden/${naam}.musicxml`, import.meta.url), 'utf8'));
const noten = (maat) => maat.elementen.filter((e) => e.soort === 'noot');
const naam = (n) => `${n.toonhoogte.stap}${n.toonhoogte.alter === 1 ? '#' : n.toonhoogte.alter === -1 ? 'b' : ''}${n.toonhoogte.octaaf}`;

test('eenvoudig: titel, componist en de partij met instrument', async () => {
  const p = await lees('eenvoudig');
  assert.equal(p.versie, 1);
  assert.equal(p.titel, 'Eenvoudig');
  assert.equal(p.componist, 'Testcomponist');
  assert.equal(p.partijen.length, 1);
  const [bugel] = p.partijen;
  assert.equal(bugel.id, 'P1');
  assert.equal(bugel.naam, 'Bugel');
  assert.equal(bugel.afkorting, 'Bgl.');
  assert.deepEqual(bugel.instrument, { midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 } });
});

test('eenvoudig: maten met nummer, opmaat en de geldende maatsoort, toonsoort en sleutel', async () => {
  const [bugel] = (await lees('eenvoudig')).partijen;
  assert.deepEqual(bugel.maten.map((m) => [m.nummer, m.index, m.opmaat]), [['0', 0, true], ['1', 1, false], ['2', 2, false], ['3', 3, false]]);
  for (const maat of bugel.maten) {
    assert.deepEqual(maat.maatsoort, { teller: 4, noemer: 4 });
    assert.deepEqual(maat.toonsoort, { kwinten: 1, modus: 'majeur' });
    assert.deepEqual(maat.sleutels, [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }]);
  }
  assert.equal(bugel.maten[0].tempo, 100);
  assert.equal(bugel.maten[1].tempo, null);
});

test('eenvoudig: noten en rusten in tikken, met voortekens', async () => {
  const [bugel] = (await lees('eenvoudig')).partijen;
  const alle = bugel.maten.flatMap((m) => m.elementen);
  assert.equal(alle.filter((e) => e.soort === 'noot').length, 9);
  assert.equal(alle.filter((e) => e.soort === 'rust').length, 1);
  assert.deepEqual(noten(bugel.maten[0]).map((n) => [naam(n), n.start, n.duur]), [['D4', 0, 480]]);
  assert.deepEqual(noten(bugel.maten[1]).map((n) => [naam(n), n.start, n.duur]), [['E4', 0, 480], ['F#4', 480, 480], ['G4', 960, 960]]);
  assert.deepEqual(noten(bugel.maten[2]).map((n) => [naam(n), n.start, n.duur]), [['A4', 0, 240], ['B4', 240, 240], ['C5', 480, 480], ['D5', 960, 960]]);
  const rust = bugel.maten[3].elementen.find((e) => e.soort === 'rust');
  assert.deepEqual(rust, { soort: 'rust', start: 960, duur: 960, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 });
  for (const n of alle.filter((e) => e.soort === 'noot')) {
    assert.equal(n.stem, 1);
    assert.equal(n.notenbalk, 1);
    assert.equal(n.akkoord, false);
    assert.equal(n.zekerheid, 1);
  }
});

test('eenvoudig: articulaties, legato, overbinding en herhaling', async () => {
  const [bugel] = (await lees('eenvoudig')).partijen;
  const [e4, , g4] = noten(bugel.maten[1]);
  assert.deepEqual(e4.articulaties, ['staccato']);
  assert.deepEqual(g4.articulaties, ['accent']);
  const [a4, b4, , d5] = noten(bugel.maten[2]);
  assert.deepEqual(a4.legato, { begin: true, eind: false });
  assert.deepEqual(b4.legato, { begin: false, eind: true });
  assert.deepEqual(d5.overbinding, { begin: true, eind: false });
  assert.deepEqual(noten(bugel.maten[3])[0].overbinding, { begin: false, eind: true });
  assert.deepEqual(bugel.maten[1].herhaling, { begin: true, eind: false, keer: 2 });
  assert.deepEqual(bugel.maten[2].herhaling, { begin: false, eind: false, keer: 2 });
  assert.deepEqual(bugel.maten[3].herhaling, { begin: false, eind: true, keer: 2 });
});

test('eenvoudig: aanwijzingen staan als elementen in de maat', async () => {
  const [bugel] = (await lees('eenvoudig')).partijen;
  const aanwijzingen = bugel.maten[0].elementen.filter((e) => e.soort === 'aanwijzing');
  assert.deepEqual(aanwijzingen.map((a) => [a.type, a.waarde, a.start]), [['tempo', 100, 0], ['dynamiek', 'mf', 0]]);
});

test('ensemble: twee partijen, twee stemmen, een akkoordloze backup en een hele-maatrust', async () => {
  const p = await lees('ensemble');
  assert.deepEqual(p.partijen.map((x) => [x.id, x.naam, x.afkorting]), [['P1', 'Althoorn', ''], ['P2', 'Trombone', 'Trb.']]);
  const [hoorn, trombone] = p.partijen;
  assert.deepEqual(hoorn.instrument, { midiProgramma: 60, transpositie: { chromatisch: -9, diatonisch: -5 } });
  assert.deepEqual(trombone.instrument, { midiProgramma: 57, transpositie: { chromatisch: 0, diatonisch: 0 } });
  assert.equal(hoorn.maten[0].tempo, 120);
  assert.deepEqual(noten(hoorn.maten[0]).map((n) => [naam(n), n.start, n.duur]), [['C5', 0, 1440]]);
  assert.deepEqual(trombone.maten[0].sleutels, [{ teken: 'F', lijn: 4, notenbalk: 1, octaafVerschuiving: 0 }]);
  assert.deepEqual(trombone.maten[0].maatsoort, { teller: 3, noemer: 4 });
  // Gesorteerd op start en dan op stem: C3 (stem 1) en C2 (stem 2) beginnen allebei op 0.
  assert.deepEqual(noten(trombone.maten[0]).map((n) => [naam(n), n.start, n.duur, n.stem]), [['C3', 0, 960, 1], ['C2', 0, 1440, 2], ['E3', 960, 480, 1]]);
  const [rust] = trombone.maten[1].elementen;
  assert.deepEqual(rust, { soort: 'rust', start: 0, duur: 1440, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 });
});

test('fout-maatduur: de maten worden gelezen zoals ze zijn, ook als ze niet kloppen', async () => {
  const [klarinet] = (await lees('fout-maatduur')).partijen;
  assert.deepEqual(klarinet.maten.map((m) => noten(m).length), [4, 3, 5, 1]);
  assert.deepEqual(klarinet.maten.map((m) => m.nummer), ['1', '2', '3', '4']);
  assert.equal(noten(klarinet.maten[2])[4].start, 1920);
});

test('akkoorden, voorslagen en divisions die niet deelbaar zijn', () => {
  const p = leesMusicXML(`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
    <part id="P1"><measure number="1">
      <attributes><divisions>3</divisions><time><beats>2</beats><beat-type>4</beat-type></time></attributes>
      <note><grace/><pitch><step>B</step><octave>4</octave></pitch><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>3</duration><voice>1</voice></note>
      <note><chord/><pitch><step>E</step><octave>5</octave></pitch><duration>3</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>F</step><alter>1</alter><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note>
    </measure></part></score-partwise>`);
  const elementen = p.partijen[0].maten[0].elementen;
  assert.equal(elementen.length, 5, 'de voorslag telt niet mee');
  assert.deepEqual(elementen.map((n) => [naam(n), n.start, n.duur, n.akkoord]), [
    ['C5', 0, 480, false], ['E5', 0, 480, true], ['D5', 480, 160, false], ['E5', 640, 160, false], ['F#5', 800, 160, false],
  ]);
  assert.equal(p.titel, '');
  assert.deepEqual(p.partijen[0].instrument, { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } });
});

test('een bestand dat geen MusicXML is, geeft een begrijpelijke fout', () => {
  assert.throws(() => leesMusicXML('dit is geen xml'), /geen geldige MusicXML/);
  assert.throws(() => leesMusicXML('<score-partwise version="4.0"><part-list/></score-partwise>'), /geen partijen/);
});
