import test from 'node:test';
import assert from 'node:assert/strict';
import { hoorbaar } from '../src/midi/hoorbaar.mjs';

const partituur = { titel: 'Proef', partijen: [{ id: 'P1' }, { id: 'P2' }, { id: 'P3' }] };
const ids = (uit) => uit.partituur.partijen.map((partij) => partij.id);

test('zonder mixer klinken alle partijen op volume 100', () => {
  const uit = hoorbaar(partituur);
  assert.deepEqual(ids(uit), ['P1', 'P2', 'P3']);
  assert.deepEqual(uit.volume, { P1: 100, P2: 100, P3: 100 });
  assert.equal(uit.partituur.titel, 'Proef');
});

test('een gedempte partij valt weg', () => {
  assert.deepEqual(ids(hoorbaar(partituur, { P2: { volume: 100, gedempt: true, solo: false } })), ['P1', 'P3']);
});

test('met solo klinken alleen de solopartijen', () => {
  assert.deepEqual(ids(hoorbaar(partituur, { P1: { solo: true }, P3: { solo: true } })), ['P1', 'P3']);
});

test('gedempt gaat voor solo', () => {
  assert.deepEqual(ids(hoorbaar(partituur, { P1: { solo: true, gedempt: true }, P2: { solo: true } })), ['P2']);
});

test('alles uit geeft een lege lijst', () => {
  const mixer = { P1: { gedempt: true }, P2: { gedempt: true }, P3: { gedempt: true } };
  assert.deepEqual(ids(hoorbaar(partituur, mixer)), []);
});

test('het volume klinkt even hard als in de speler', () => {
  const { volume } = hoorbaar(partituur, { P1: { volume: 50 }, P2: { volume: 127 }, P3: { volume: 0 } });
  assert.deepEqual(volume, { P1: 71, P2: 113, P3: 0 });
});

test('de partituur zelf blijft ongemoeid', () => {
  hoorbaar(partituur, { P1: { gedempt: true } });
  assert.equal(partituur.partijen.length, 3);
});
