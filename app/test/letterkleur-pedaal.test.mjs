import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const voorbeeld = async () => leesMusicXML(await readFile(new URL('./voorbeelden/eenvoudig.musicxml', import.meta.url), 'utf8'));

test('een onzekere repetitieletter krijgt alleen voor de weergave een kleur', async () => {
  const partituur = await voorbeeld();
  const elementen = partituur.partijen[0].maten[0].elementen;
  elementen.push({ soort: 'aanwijzing', start: 0, type: 'letter', waarde: 'A', zekerheid: 0.5 });

  const metWeergave = naarMusicXML(partituur, { weergave: true });
  assert.match(metWeergave, /<rehearsal enclosure="square" color="#C0392B">A<\/rehearsal>/);

  const zonderWeergave = naarMusicXML(partituur);
  assert.match(zonderWeergave, /<rehearsal enclosure="square">A<\/rehearsal>/);
  assert.doesNotMatch(zonderWeergave, /<rehearsal[^>]*color=/);
});

test('een zekere repetitieletter krijgt nooit een kleur', async () => {
  const partituur = await voorbeeld();
  partituur.partijen[0].maten[0].elementen.push({
    soort: 'aanwijzing', start: 0, type: 'letter', waarde: 'B', zekerheid: 1,
  });

  assert.doesNotMatch(naarMusicXML(partituur, { weergave: true }), /<rehearsal[^>]*color=/);
});

test('pedaalaanduidingen blijven behouden bij lezen en terugschrijven', () => {
  const xml = `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
    <part id="P1"><measure number="1"><attributes><divisions>480</divisions></attributes>
      <direction><direction-type><pedal type="start"/></direction-type></direction>
      <direction><direction-type><pedal type="stop"/></direction-type></direction>
      <direction><direction-type><pedal type="continue"/></direction-type></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1920</duration><voice>1</voice><type>whole</type></note>
    </measure></part></score-partwise>`;
  const gelezen = leesMusicXML(xml);
  const pedalen = gelezen.partijen[0].maten[0].elementen.filter((element) => element.type === 'pedaal');
  assert.deepEqual(pedalen.map(({ type, waarde }) => [type, waarde]), [
    ['pedaal', 'begin'],
    ['pedaal', 'eind'],
    ['pedaal', 'wissel'],
  ]);

  const terug = naarMusicXML(gelezen);
  assert.match(terug, /<pedal type="start"\/>/);
  assert.match(terug, /<pedal type="stop"\/>/);
  assert.match(terug, /<pedal type="continue"\/>/);
  assert.deepEqual(
    leesMusicXML(terug).partijen[0].maten[0].elementen.filter((element) => element.type === 'pedaal'),
    pedalen,
  );
});
