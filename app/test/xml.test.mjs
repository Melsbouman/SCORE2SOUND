import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesXml, kind, kinderen, tekst, getal } from '../src/musicxml/xml.mjs';

const voorbeeld = (naam) => readFile(new URL(`./voorbeelden/${naam}`, import.meta.url), 'utf8');

test('leesXml geeft de score-partwise met kinderen in volgorde', async () => {
  const wortel = leesXml(await voorbeeld('ensemble.musicxml'));
  assert.equal(wortel.naam, 'score-partwise');
  assert.equal(wortel.attr.version, '4.0');
  const partijen = kinderen(wortel, 'part');
  assert.deepEqual(partijen.map((p) => p.attr.id), ['P1', 'P2']);
  // In maat 1 van de trombone: note, note, backup, note, in die volgorde.
  const maat = kind(partijen[1], 'measure');
  assert.deepEqual(kinderen(maat).map((k) => k.naam), ['attributes', 'direction', 'note', 'note', 'backup', 'note']);
});

test('tekst en getal lezen kinderen, met een standaardwaarde', async () => {
  const wortel = leesXml(await voorbeeld('eenvoudig.musicxml'));
  assert.equal(tekst(kind(wortel, 'work'), 'work-title'), 'Eenvoudig');
  const noot = kind(kind(kind(wortel, 'part'), 'measure'), 'note');
  assert.equal(tekst(kind(noot, 'pitch'), 'step'), 'D');
  assert.equal(getal(noot, 'duration'), 2);
  assert.equal(getal(noot, 'bestaat-niet', 7), 7);
  assert.equal(tekst(noot, 'bestaat-niet', 'leeg'), 'leeg');
  assert.equal(kind(noot, 'bestaat-niet'), null);
  assert.deepEqual(kinderen(null, 'note'), []);
});

test('leesXml geeft een begrijpelijke fout bij verkeerde invoer', () => {
  assert.throws(() => leesXml(''), /leeg/);
  assert.throws(() => leesXml('<score-partwise><part>'), /geen geldige MusicXML/);
  assert.throws(() => leesXml('<html><body/></html>'), /geen MusicXML-partituur/);
  assert.throws(() => leesXml('<score-timewise version="4.0"/>'), /timewise/);
  assert.throws(() => leesXml('<!DOCTYPE x [<!ENTITY a "aaaa">]><score-partwise>&a;</score-partwise>'), /niet zijn toegestaan/);
});
