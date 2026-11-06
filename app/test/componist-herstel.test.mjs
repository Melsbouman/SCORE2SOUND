import test from 'node:test';
import assert from 'node:assert/strict';
import { herstelComponist } from '../src/model/titelgegevens.mjs';

test('herstelComponist verandert D. SHOSTAKOVICH niet (geen correctie)', () => {
  assert.equal(herstelComponist('D. SHOSTAKOVICH'), 'D. SHOSTAKOVICH');
});

test('herstelComponist verandert d. shostakovich niet (geen correctie)', () => {
  assert.equal(herstelComponist('d. shostakovich'), 'd. shostakovich');
});

test('herstelComponist verandert Dmitri Shostakovich niet (geen correctie)', () => {
  assert.equal(herstelComponist('Dmitri Shostakovich'), 'Dmitri Shostakovich');
});

test('herstelComponist verandert Thierry Deleruyelle niet (geen correctie)', () => {
  assert.equal(herstelComponist('Thierry Deleruyelle'), 'Thierry Deleruyelle');
});

test('herstelComponist geeft een lege string ongewijzigd', () => {
  assert.equal(herstelComponist(''), '');
});
