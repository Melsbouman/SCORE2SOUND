import test from 'node:test';
import assert from 'node:assert/strict';
import { stapelKaart } from '../src/model/stapels.mjs';

const maat = (extra = {}) => ({ elementen: [], ...extra });

test('zonder samengestelde rust is stapel n gewoon maat n', () => {
  assert.deepEqual(stapelKaart([maat(), maat(), maat()]), [0, 1, 2]);
});

test('een samengestelde rust van 6 maten is één stapel: de volgende stapel is de zevende maat', () => {
  const maten = [maat(), maat({ maatrust: 6 }), maat({ verborgen: true }), maat({ verborgen: true }), maat({ verborgen: true }),
    maat({ verborgen: true }), maat({ verborgen: true }), maat(), maat()];
  assert.deepEqual(stapelKaart(maten), [0, 1, 7, 8]);
});

test('twee samengestelde rusten achter elkaar en een rust van 2 maten', () => {
  const maten = [maat({ maatrust: 2 }), maat({ verborgen: true }), maat({ maatrust: 3 }), maat({ verborgen: true }), maat({ verborgen: true }), maat()];
  assert.deepEqual(stapelKaart(maten), [0, 2, 5]);
});

test('een rust die langer is dan wat er over is, geeft geen stapels buiten de partij', () => {
  assert.deepEqual(stapelKaart([maat(), maat({ maatrust: 8 })]), [0, 1]);
});
