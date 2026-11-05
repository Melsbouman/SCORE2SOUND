import assert from 'node:assert/strict';
import test from 'node:test';

import { leesBlad } from '../src/server/tekstlezer.mjs';

test('leesBlad geeft herkende regels en woordvakken terug', async () => {
  const uitvoerder = async () => '{"breedte":100,"hoogte":50,"regels":[{"tekst":"Vivace","woorden":[{"tekst":"Vivace","x":10,"y":5,"breedte":40,"hoogte":12}]}]}';

  const resultaat = await leesBlad('blad.png', { uitvoerder });

  assert.deepEqual(resultaat, {
    breedte: 100,
    hoogte: 50,
    regels: [{
      tekst: 'Vivace',
      woorden: [{ tekst: 'Vivace', x: 10, y: 5, breedte: 40, hoogte: 12 }],
    }],
  });
});

test('leesBlad geeft geen regels terug als de uitvoerder faalt', async () => {
  const uitvoerder = async () => {
    throw new Error('OCR mislukt');
  };

  const resultaat = await leesBlad('blad.png', { uitvoerder });

  assert.deepEqual(resultaat.regels, []);
});
