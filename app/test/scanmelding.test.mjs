import test from 'node:test';
import assert from 'node:assert/strict';

import { scanMelding } from '../src/model/scanmelding.mjs';

const MELDING =
  'Een kwart of meer van de noten is onzeker. Een scherpere scan (300 dpi, recht gehouden) geeft een beter resultaat.';

function maakPartituur(aantalNoten, aantalOnzekereNoten) {
  return {
    partijen: [
      {
        gebeurtenissen: Array.from({ length: aantalNoten }, (_, index) => ({
          soort: 'noot',
          zekerheid: index < aantalOnzekereNoten ? 0.79 : 0.8,
        })),
      },
    ],
  };
}

test('geeft een melding als meer dan een kwart van minstens twintig noten onzeker is', () => {
  assert.equal(scanMelding(maakPartituur(20, 6)), MELDING);
});

test('geeft geen melding bij precies een kwart onzekere noten', () => {
  assert.equal(scanMelding(maakPartituur(20, 5)), null);
});

test('geeft geen melding als er minder dan twintig noten zijn', () => {
  assert.equal(scanMelding(maakPartituur(19, 19)), null);
});
