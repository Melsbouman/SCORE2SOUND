import test from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTEN } from '../src/model/instrumenten.mjs';
import { FAMILIES_KIEZER, GENRES, instrumentenVoorFamilie, zoekInstrumenten, sorteerPartituur } from '../src/model/instrumentkiezer.mjs';

test('elke familie heeft instrumenten en elk instrument staat in precies een familie', () => {
  for (const familie of FAMILIES_KIEZER) assert.ok(instrumentenVoorFamilie(familie.id).length > 0, familie.id);
  const geteld = FAMILIES_KIEZER.flatMap((familie) => instrumentenVoorFamilie(familie.id).map((i) => i.id));
  assert.deepEqual([...geteld].sort(), INSTRUMENTEN.map((i) => i.id).sort());
});

test('elk id in een genrevolgorde bestaat', () => {
  const ids = new Set(INSTRUMENTEN.map((i) => i.id));
  for (const genre of GENRES) for (const id of genre.volgorde) assert.ok(ids.has(id), `${genre.id}: ${id}`);
  assert.ok(GENRES.some((g) => g.id === 'brassband'));
});

test('families en zoeken', () => {
  const koper = instrumentenVoorFamilie('koper').map((i) => i.id);
  assert.ok(koper.includes('trombone') && koper.includes('tuba'));
  assert.ok(zoekInstrumenten('TROMB').some((i) => i.id === 'trombone'));
  assert.deepEqual(zoekInstrumenten('  '), []);
});

test('sorteerPartituur volgt het genre, onbekende ids komen achteraan', () => {
  const uit = sorteerPartituur(['tuba', 'bugel', 'trombone'], 'brassband');
  assert.ok(uit.indexOf('bugel') < uit.indexOf('trombone') && uit.indexOf('trombone') < uit.indexOf('tuba'));
  assert.deepEqual(sorteerPartituur(['piano', 'onbekend', 'tuba'], 'brassband'), ['tuba', 'piano', 'onbekend']);
});
