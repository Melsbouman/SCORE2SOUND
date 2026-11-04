import test from 'node:test';
import assert from 'node:assert/strict';

import { partijNaamUitKop } from '../src/model/partijnaam.mjs';

test('partijNaamUitKop schoont stemming, leestekens en hoofdletters op', () => {
  assert.equal(partijNaamUitKop('2nd CORNET BE:'), '2nd Cornet');
  assert.equal(partijNaamUitKop('2nd Bb Cornet'), '2nd Cornet');
  assert.equal(partijNaamUitKop('Solo Cornet 3, 4'), 'Solo Cornet 3, 4');
  assert.equal(partijNaamUitKop('Thierry Deleruyelle'), null);
});
