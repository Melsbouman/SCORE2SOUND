import test from 'node:test';
import assert from 'node:assert/strict';
import { uitvoeringVanNoot } from '../src/midi/uitvoering.mjs';

const noot = (articulaties = []) => ({
  start: 480,
  duur: 480,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 4 },
  articulaties,
  legato: { begin: false, eind: false },
});

test('een staccato noot is korter dan een tenuto noot', () => {
  const staccato = uitvoeringVanNoot(noot(['staccato']), { sterkte: 80, positieInMaat: 480 });
  const tenuto = uitvoeringVanNoot(noot(['tenuto']), { sterkte: 80, positieInMaat: 480 });
  assert.ok(staccato.duurFactor < tenuto.duurFactor);
});

test('een accent heeft een hogere velocity dan dezelfde noot zonder accent', () => {
  const gewoon = uitvoeringVanNoot(noot(), { sterkte: 80, positieInMaat: 480 });
  const accent = uitvoeringVanNoot(noot(['accent']), { sterkte: 80, positieInMaat: 480 });
  assert.ok(accent.velocity > gewoon.velocity);
});

test('de uitvoering is bij dezelfde invoer altijd gelijk', () => {
  const invoer = noot(['tenuto']);
  const opties = { sterkte: 80, positieInMaat: 480 };
  assert.deepEqual(uitvoeringVanNoot(invoer, opties), uitvoeringVanNoot(invoer, opties));
});

test('velocity blijft tussen 1 en 127', () => {
  assert.equal(uitvoeringVanNoot(noot(), { sterkte: -20, positieInMaat: 480 }).velocity, 1);
  assert.equal(uitvoeringVanNoot(noot(['marcato']), { sterkte: 127, positieInMaat: 0 }).velocity, 127);
});
