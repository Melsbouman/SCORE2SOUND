import test from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTEN, instrumentBijNaam } from '../src/model/instrumenten.mjs';

const id = (naam) => instrumentBijNaam(naam)?.id ?? null;

test('de lijst kent Es-kornet, sopraansaxofoon en baritonsaxofoon met de juiste stemming', () => {
  const zoek = (naam) => INSTRUMENTEN.find((instrument) => instrument.id === naam);
  assert.deepEqual(zoek('es-kornet').transpositie, { chromatisch: 3, diatonisch: 2 });
  assert.deepEqual(zoek('sopraansaxofoon').transpositie, { chromatisch: -2, diatonisch: -1 });
  assert.deepEqual(zoek('baritonsaxofoon').transpositie, { chromatisch: -21, diatonisch: -12 });
});

test('instrumentBijNaam herkent ze aan de partijnaam', () => {
  assert.equal(id('Eb Cornet'), 'es-kornet');
  assert.equal(id('Eb Comet'), 'es-kornet');
  assert.equal(id('Es-kornet'), 'es-kornet');
  assert.equal(id('Sax Soprano'), 'sopraansaxofoon');
  assert.equal(id('Sax Baritone'), 'baritonsaxofoon');
  assert.equal(id('Solo Cornet'), 'trompet');
});
