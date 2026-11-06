import test from 'node:test';
import assert from 'node:assert/strict';
import { iconSvg, ICOONNAMEN } from '../public/js/iconen.js';

test('iconSvg geeft een svg voor een bekende naam en niets voor een onbekende', () => {
  assert.ok(ICOONNAMEN.includes('undo-2'));
  assert.match(iconSvg('undo-2'), /^<svg class="icoon" width="20" height="20"/);
  assert.match(iconSvg('undo-2', 16), /width="16"/);
  assert.equal(iconSvg('bestaat-niet'), '');
});
