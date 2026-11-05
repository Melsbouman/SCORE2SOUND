import test from 'node:test';
import assert from 'node:assert/strict';
import { maakLeegStuk, voegPartijToe } from '../src/model/nieuw.mjs';

test('gelijke instrumenten krijgen een doorlopende nummering', () => {
  const stuk = maakLeegStuk({ instrumenten: ['viool', 'viool', 'altviool'] });
  assert.deepEqual(stuk.partijen.map((partij) => partij.naam), ['Viool 1', 'Viool 2', 'Altviool']);

  const uitgebreid = voegPartijToe(stuk, 'viool');
  assert.deepEqual(uitgebreid.partijen.map((partij) => partij.naam), [
    'Viool 1', 'Viool 2', 'Altviool', 'Viool 3',
  ]);
});
