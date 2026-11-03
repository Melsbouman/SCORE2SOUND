import test from 'node:test';
import assert from 'node:assert/strict';
import { herstelTitel } from '../src/model/titel.mjs';

test('een losse hoofdletter midden in een titel in hoofdletters hoort bij het woord ervoor', () => {
  assert.equal(herstelTitel('SAN D AND STARS'), 'SAND AND STARS');
  assert.equal(herstelTitel('MOUNTAIN S OF THE MOON'), 'MOUNTAINS OF THE MOON');
});

test('gewone titels blijven zoals ze zijn', () => {
  for (const titel of ['A TIME FOR PEACE', 'PLAN B', 'Sand and Stars', 'THE LONG AND WINDING ROAD', 'O CANADA', 'I WILL SURVIVE', '', 'ROCKY 4']) {
    assert.equal(herstelTitel(titel), titel);
  }
});

test('een niet-tekst blijft ongewijzigd', () => {
  assert.equal(herstelTitel(undefined), undefined);
  assert.equal(herstelTitel(null), null);
});
