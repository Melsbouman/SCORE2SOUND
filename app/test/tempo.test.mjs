import test from 'node:test';
import assert from 'node:assert/strict';
import { tempoLijst, verwijderTempo, zetTempo } from '../src/model/tempo.mjs';

function partituur() {
  const maten = Array.from({ length: 5 }, (_, index) => ({
    nummer: index + 1,
    elementen: [],
  }));
  return {
    partijen: [
      { maten: structuredClone(maten) },
      { maten: structuredClone(maten) },
    ],
  };
}

test('tempoLijst gebruikt standaard 120 en leest veld en aanwijzing', () => {
  const bron = partituur();
  bron.partijen[0].maten[2].tempo = 96;
  bron.partijen[0].maten[4].elementen.push({
    soort: 'aanwijzing',
    start: 0,
    type: 'tempo',
    waarde: 180,
  });
  assert.deepEqual(tempoLijst(bron), [
    { maat: 0, nummer: 1, bpm: 120 },
    { maat: 2, nummer: 3, bpm: 96 },
    { maat: 4, nummer: 5, bpm: 180 },
  ]);
});

test('zetTempo werkt voor alle partijen zonder het origineel te wijzigen', () => {
  const bron = partituur();
  const nieuwe = zetTempo(bron, 1, 180.4);
  assert.equal(nieuwe.partijen[0].maten[1].tempo, 180);
  assert.equal(nieuwe.partijen[1].maten[1].tempo, 180);
  assert.equal(bron.partijen[0].maten[1].tempo, undefined);
});

test('zetTempo vervangt een bestaande aanwijzing zonder verdubbeling', () => {
  const bron = partituur();
  bron.partijen[0].maten[1].elementen.push({
    soort: 'aanwijzing', start: 0, type: 'tempo', waarde: 96, zekerheid: 1,
  });
  const nieuwe = zetTempo(bron, 1, 180);
  const tempo = nieuwe.partijen[0].maten[1].elementen.filter(
    (element) => element.soort === 'aanwijzing' && element.type === 'tempo'
  );
  assert.equal(tempo.length, 1);
  assert.equal(tempo[0].waarde, 180);
});

test('verwijderTempo haalt veld en aanwijzing uit alle partijen', () => {
  const bron = zetTempo(partituur(), 2, 96);
  const nieuwe = verwijderTempo(bron, 2);
  for (const partij of nieuwe.partijen) {
    assert.equal(partij.maten[2].tempo, undefined);
    assert.equal(partij.maten[2].elementen.some((element) => element.type === 'tempo'), false);
  }
  assert.equal(bron.partijen[0].maten[2].tempo, 96);
});

test('tempo geeft vaste foutmeldingen', () => {
  assert.throws(() => zetTempo(partituur(), 0, 19), {
    message: 'Kies een tempo tussen 20 en 300.',
  });
  assert.throws(() => zetTempo(partituur(), 0, '120'), {
    message: 'Kies een tempo tussen 20 en 300.',
  });
  assert.throws(() => verwijderTempo(partituur(), 0), {
    message: 'Het begintempo kan niet worden weggehaald.',
  });
});
