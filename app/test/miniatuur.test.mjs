import test from 'node:test';
import assert from 'node:assert/strict';
import { miniatuurSvg } from '../public/js/miniatuur.js';

test('miniatuurSvg geeft een svg met vijf lijnen en negen noten', () => {
  const svg = miniatuurSvg('Für Elise');
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.endsWith('</svg>'));
  assert.equal(svg.match(/<line /g).length, 5);
  assert.equal(svg.match(/<ellipse /g).length, 9);
});

test('miniatuurSvg is voor dezelfde titel altijd gelijk', () => {
  assert.equal(miniatuurSvg('Menuet in G'), miniatuurSvg('Menuet in G'));
});

test('miniatuurSvg verschilt per titel', () => {
  assert.notEqual(miniatuurSvg('Für Elise'), miniatuurSvg('Ode an die Freude'));
});

test('miniatuurSvg werkt met een lege titel', () => {
  const svg = miniatuurSvg('');
  assert.equal(svg.match(/<ellipse /g).length, 9);
});

test('miniatuurSvg is verborgen voor hulpsoftware', () => {
  assert.match(miniatuurSvg('x'), /aria-hidden="true"/);
});
