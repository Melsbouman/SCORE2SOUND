import test from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTEN } from '../src/model/instrumenten.mjs';
import { SJABLONEN, maakLeegStuk } from '../src/model/nieuw.mjs';

test('sjablonen hebben unieke ids, bestaande instrumenten en maken een leeg stuk', () => {
  const ids = SJABLONEN.map((sjabloon) => sjabloon.id);
  assert.equal(new Set(ids).size, ids.length);

  const instrumentIds = new Set(INSTRUMENTEN.map((instrument) => instrument.id));
  for (const sjabloon of SJABLONEN) {
    assert.ok(sjabloon.instrumenten.every((id) => instrumentIds.has(id)));
    const stuk = maakLeegStuk({ instrumenten: sjabloon.instrumenten });
    assert.equal(stuk.partijen.length, sjabloon.instrumenten.length);
  }
});
