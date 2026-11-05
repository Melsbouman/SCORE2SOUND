import test from 'node:test';
import assert from 'node:assert/strict';
import { uitvoeringVanNoot } from '../src/midi/uitvoering.mjs';

const noot = (extra = {}) => ({
  start: 0,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 4 },
  articulaties: [],
  legato: { begin: false, eind: false },
  ...extra,
});

test('de uitvoer is bij dezelfde invoer altijd gelijk', () => {
  const invoer = noot({ articulaties: ['accent'] });
  const opties = { sterkte: 80, positieInMaat: 480 };
  assert.deepEqual(uitvoeringVanNoot(invoer, opties), uitvoeringVanNoot(invoer, opties));
});

test('velocity blijft tussen 1 en 127', () => {
  assert.equal(uitvoeringVanNoot(noot(), { sterkte: -100, positieInMaat: 0 }).velocity, 1);
  assert.equal(uitvoeringVanNoot(noot({ articulaties: ['marcato'] }), { sterkte: 200, positieInMaat: 0 }).velocity, 127);
});
