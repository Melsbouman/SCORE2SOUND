import test from 'node:test';
import assert from 'node:assert/strict';
import { partijTekstVoorSpeler } from '../src/model/spelertekst.mjs';

test('een partituur met een partij geeft de naam', () => {
  assert.equal(partijTekstVoorSpeler({ partijen: [{ naam: 'Sax Soprano' }] }), 'Sax Soprano');
});

test('een partituur met drie partijen geeft het aantal', () => {
  const partituur = { partijen: [{ naam: 'Fluit' }, { naam: 'Hobo' }, { naam: 'Fagot' }] };

  assert.equal(partijTekstVoorSpeler(partituur), '3 partijen');
});

test('een partituur zonder partijen geeft een lege tekst', () => {
  assert.equal(partijTekstVoorSpeler({ partijen: [] }), '');
});
