import test from 'node:test';
import assert from 'node:assert/strict';

import { maakLimiet } from '../src/server/limiet.mjs';

test('staat hooguit het maximum aantal pogingen per venster toe', () => {
  const toegestaan = maakLimiet({ max: 3, venster: 1000 });

  assert.equal(toegestaan('127.0.0.1'), true);
  assert.equal(toegestaan('127.0.0.1'), true);
  assert.equal(toegestaan('127.0.0.1'), true);
  assert.equal(toegestaan('127.0.0.1'), false);
});

test('staat na het venster weer pogingen toe', () => {
  let tijd = 1000;
  const toegestaan = maakLimiet({ max: 1, venster: 500, nu: () => tijd });

  assert.equal(toegestaan('127.0.0.1'), true);
  assert.equal(toegestaan('127.0.0.1'), false);

  tijd = 1500;
  assert.equal(toegestaan('127.0.0.1'), true);
});

test('houdt per sleutel een eigen teller bij', () => {
  const toegestaan = maakLimiet({ max: 1, venster: 1000 });

  assert.equal(toegestaan('127.0.0.1'), true);
  assert.equal(toegestaan('127.0.0.1'), false);
  assert.equal(toegestaan('127.0.0.2'), true);
  assert.equal(toegestaan('127.0.0.2'), false);
});

test('ruimt oude sleutels op', () => {
  let tijd = 0;
  const toegestaan = maakLimiet({ max: 1, venster: 100, nu: () => tijd });

  for (let nummer = 0; nummer < 100; nummer += 1) {
    toegestaan(`sleutel-${nummer}`);
  }
  assert.equal(toegestaan.aantalSleutels(), 100);

  tijd = 100;
  toegestaan('nieuw');
  assert.equal(toegestaan.aantalSleutels(), 1);
});
