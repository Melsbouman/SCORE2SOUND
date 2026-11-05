import test from 'node:test';
import assert from 'node:assert/strict';
import { verdeelPartijenOverBladen } from '../src/export/bladverdeling.mjs';

const partij = (index, aantalBalken = 1) => ({
  id: `P${index}`,
  naam: `Partij ${index}`,
  maten: [{
    sleutels: Array.from({ length: aantalBalken }, (_, sleutelIndex) => ({
      teken: sleutelIndex === 0 ? 'G' : 'F',
      lijn: sleutelIndex === 0 ? 2 : 4,
      notenbalk: sleutelIndex + 1,
    })),
  }],
});

const partituur = (partijen) => ({
  versie: 1,
  titel: 'Brassband',
  componist: 'Componist',
  arrangeur: 'Arrangeur',
  partijen,
});

test('verdeelt 24 enkelbalkige partijen in groepen van 14 en 10', () => {
  const bron = partituur(Array.from({ length: 24 }, (_, index) => partij(index + 1)));

  const bladen = verdeelPartijenOverBladen(bron, { maxNotenbalken: 14 });

  assert.deepEqual(bladen.map((blad) => blad.partijen.length), [14, 10]);
  assert.deepEqual(bladen.flatMap((blad) => blad.partijen.map((deel) => deel.id)),
    Array.from({ length: 24 }, (_, index) => `P${index + 1}`));
  assert.deepEqual(bladen.map(({ titel, componist, arrangeur }) => ({ titel, componist, arrangeur })), [
    { titel: 'Brassband', componist: 'Componist', arrangeur: 'Arrangeur' },
    { titel: 'Brassband', componist: 'Componist', arrangeur: 'Arrangeur' },
  ]);
});

test('telt de twee notenbalken van een piano afzonderlijk', () => {
  const bron = partituur([partij(1, 2), partij(2), partij(3)]);

  const bladen = verdeelPartijenOverBladen(bron, { maxNotenbalken: 3 });

  assert.deepEqual(bladen.map((blad) => blad.partijen.map((deel) => deel.naam)), [
    ['Partij 1', 'Partij 2'],
    ['Partij 3'],
  ]);
});

test('geeft het origineel terug wanneer de partituur binnen de grens blijft', () => {
  const bron = partituur([partij(1), partij(2)]);

  const bladen = verdeelPartijenOverBladen(bron);

  assert.equal(bladen.length, 1);
  assert.equal(bladen[0], bron);
});
