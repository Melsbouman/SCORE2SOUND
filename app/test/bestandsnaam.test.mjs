import test from 'node:test';
import assert from 'node:assert/strict';

import { veiligeNaam } from '../src/export/bestandsnaam.mjs';

test('vervangt verboden tekens in een bestandsnaam', () => {
  assert.equal(veiligeNaam('Rock: live?'), 'Rock- live-');
});

test('gebruikt de reserve voor een lege naam', () => {
  assert.equal(veiligeNaam(''), 'partituur');
});

test('kapt een lange naam af op 80 tekens', () => {
  assert.equal(veiligeNaam('a'.repeat(200)).length, 80);
});
