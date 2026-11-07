import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTEN } from '../src/model/paletten.mjs';

const SECTION_IDS = ['sleutels', 'toonsoorten', 'maatsoorten', 'tempo', 'toonhoogte', 'voortekens', 'dynamiek', 'articulaties', 'tekst', 'herhalingen', 'maatstrepen'];

test('palette sections exist in correct order', () => {
  const ids = PALETTEN.map(section => section.id);
  assert.deepStrictEqual(ids, SECTION_IDS);
});

PALETTEN.forEach(section => {
  test(`section ${section.id} items have id, naam and action`, () => {
    section.items.forEach(item => {
      assert.ok(item.id, `item in ${section.id} missing id`);
      assert.ok(item.naam, `item ${item.id} in ${section.id} missing naam`);
      assert.ok(item.actie, `item ${item.id} in ${section.id} missing actie`);
      assert.ok(item.actie.soort, `item ${item.id} actie missing soort`);
    });
  });
  test(`section ${section.id} item ids are unique`, () => {
    const ids = section.items.map(i => i.id);
    const unique = new Set(ids);
    assert.strictEqual(ids.length, unique.size, `duplicate ids in ${section.id}`);
  });
});

test('toonsoorten has 16 items', () => {
  const tonalitySection = PALETTEN.find(s => s.id === 'toonsoorten');
  assert.strictEqual(tonalitySection.items.length, 16, 'expected 16 tonalities');
});

test('maatsoorten contains 4/4 item with correct action', () => {
  const meterSection = PALETTEN.find(s => s.id === 'maatsoorten');
  const item44 = meterSection.items.find(i => i.naam === '4/4');
  assert.ok(item44, '4/4 item missing');
  assert.strictEqual(item44.actie.soort, 'maatsoort');
  assert.deepStrictEqual(item44.actie.waarde, { teller: 4, noemer: 4 });
});

test('tempo contains Allegro item with value 120', () => {
  const tempoSection = PALETTEN.find(s => s.id === 'tempo');
  const allegro = tempoSection.items.find(i => i.naam === 'Allegro');
  assert.ok(allegro, 'Allegro item missing');
  assert.strictEqual(allegro.actie.soort, 'tempo');
  assert.strictEqual(allegro.actie.waarde, 120);
});