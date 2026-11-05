import test from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTEN } from '../src/model/instrumenten.mjs';
import { FAMILIES, combinatieKaarten } from '../src/model/nieuw.mjs';

test('elk instrument staat in precies één familie', () => {
  const instrumentIds = INSTRUMENTEN.map((instrument) => instrument.id);
  const familieIds = FAMILIES.flatMap((familie) => familie.instrumenten);
  assert.deepEqual([...familieIds].sort(), [...instrumentIds].sort());
  assert.equal(new Set(familieIds).size, familieIds.length);
});

test('combinatiekaarten zijn volledig en verwijzen naar bestaande instrumenten', () => {
  const kaarten = combinatieKaarten();
  const ids = kaarten.map((kaart) => kaart.id);
  const instrumentIds = new Set(INSTRUMENTEN.map((instrument) => instrument.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const kaart of kaarten) {
    assert.ok(kaart.naam.length > 0, `${kaart.id} heeft geen naam`);
    assert.ok(kaart.beschrijving.length > 0, `${kaart.id} heeft geen beschrijving`);
    assert.equal(kaart.aantal, kaart.instrumenten.length);
    for (const instrumentId of kaart.instrumenten) {
      assert.ok(instrumentIds.has(instrumentId), `${kaart.id} bevat een onbekend instrument: ${instrumentId}`);
    }
  }
});

test('eigen keuze begint zonder instrumenten', () => {
  const eigen = combinatieKaarten().find((kaart) => kaart.id === 'eigen');
  assert.equal(eigen.instrumenten.length, 0);
  assert.equal(eigen.aantal, 0);
});
