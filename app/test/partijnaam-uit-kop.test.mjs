import test from 'node:test';
import assert from 'node:assert/strict';
import { partijNaamUitKop } from '../src/model/partijnaam.mjs';

test('een kopregel met een instrument wordt de partijnaam, zonder het toonsoort-voorvoegsel', () => {
  assert.equal(partijNaamUitKop('Bb Solo Cornet 3, 4'), 'Solo Cornet 3, 4');
  assert.equal(partijNaamUitKop('B♭ Solo Cornet 3, 4'), 'Solo Cornet 3, 4');
  assert.equal(partijNaamUitKop('Eb Soprano Cornet'), 'Soprano Cornet');
  assert.equal(partijNaamUitKop('Bb  Euphonium 1'), 'Euphonium 1');
  assert.equal(partijNaamUitKop('Flugelhorn 1'), 'Flugelhorn 1');
});

test('regels zonder instrument geven null', () => {
  for (const regel of ['Thierry Deleruyelle', 'SAN D AND STARS', 'Le Bourget, 1935', '', '12']) {
    assert.equal(partijNaamUitKop(regel), null, regel);
  }
});
