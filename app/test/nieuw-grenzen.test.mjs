import test from 'node:test';
import assert from 'node:assert/strict';
import { maakLeegStuk } from '../src/model/nieuw.mjs';

test('maakLeegStuk accepteert de grenzen voor tempo en aantal maten', () => {
  assert.equal(maakLeegStuk({ tempo: 30, aantalMaten: 1 }).partijen[0].maten.length, 1);
  assert.equal(maakLeegStuk({ tempo: 300, aantalMaten: 400 }).partijen[0].maten.length, 400);
});

test('maakLeegStuk wijst een tempo buiten 30 tot en met 300 af', () => {
  assert.throws(() => maakLeegStuk({ tempo: 29 }), {
    message: 'Kies een tempo tussen 30 en 300.',
  });
  assert.throws(() => maakLeegStuk({ tempo: 301 }), {
    message: 'Kies een tempo tussen 30 en 300.',
  });
});

test('maakLeegStuk wijst meer dan 400 maten af', () => {
  assert.throws(() => maakLeegStuk({ aantalMaten: 401 }), {
    message: 'Het aantal maten mag niet meer dan 400 zijn.',
  });
});
