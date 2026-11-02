import test from 'node:test';
import assert from 'node:assert/strict';
import { maakGeschiedenis } from '../src/model/geschiedenis.mjs';
import { maakApp } from '../public/js/app.js';

test('ongedaan en opnieuw lopen in de goede volgorde', () => {
  const g = maakGeschiedenis(10);
  g.zet('a'); g.zet('b'); g.zet('c');
  assert.equal(g.ongedaan(), 'b');
  assert.equal(g.ongedaan(), 'a');
  assert.equal(g.kanOngedaan(), false);
  assert.equal(g.ongedaan(), null);
  assert.equal(g.opnieuw(), 'b');
  assert.equal(g.opnieuw(), 'c');
  assert.equal(g.opnieuw(), null);
});

test('een nieuwe wijziging na ongedaan maken wist de opnieuw-stappen', () => {
  const g = maakGeschiedenis(10);
  g.zet('a'); g.zet('b');
  g.ongedaan();
  assert.equal(g.kanOpnieuw(), true);
  g.zet('x');
  assert.equal(g.kanOpnieuw(), false);
  assert.equal(g.ongedaan(), 'a');
});

test('bewaart hooguit max oudere standen', () => {
  const g = maakGeschiedenis(2);
  for (const s of ['1', '2', '3', '4', '5']) g.zet(s);
  assert.equal(g.ongedaan(), '4');
  assert.equal(g.ongedaan(), '3');
  assert.equal(g.ongedaan(), null);
});

test('app.zet legt een partituur vast; app.ongedaan en app.opnieuw zetten hem terug en melden partituur', () => {
  const app = maakApp();
  const gemeld = [];
  app.op('partituur', (p) => gemeld.push(p));
  app.zet({ partituur: 'a' });
  app.zet({ partituur: 'b' });
  app.ongedaan();
  assert.equal(app.stand.partituur, 'a');
  app.opnieuw();
  assert.equal(app.stand.partituur, 'b');
  assert.deepEqual(gemeld, ['a', 'b', 'a', 'b']);
  app.zet({ meldingen: [] });
  app.ongedaan();
  assert.equal(app.stand.partituur, 'a');
});
