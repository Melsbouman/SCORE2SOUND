import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfNoot } from '../src/model/invoeren.mjs';
import { maakLeegStuk } from '../src/model/nieuw.mjs';
import { maakTriool } from '../src/model/triolen.mjs';

test('maakTriool maakt van een geschreven kwartnoot drie trioolnoten', () => {
  const leeg = maakLeegStuk({ instrumenten: ['trompet'], aantalMaten: 1 });
  const metNoot = schrijfNoot(
    leeg,
    'P1',
    0,
    0,
    480,
    { stap: 'C', alter: 0, octaaf: 5 },
  );

  const resultaat = maakTriool(metNoot, 'n-P1-0-0');
  const elementen = resultaat.partijen[0].maten[0].elementen
    .filter((element) => element.soort === 'noot');

  assert.deepEqual(elementen.map(({ start, duur, tuplet }) => ({ start, duur, tuplet })), [
    {
      start: 0,
      duur: 160,
      tuplet: { aantal: 3, normaal: 2, begin: true, eind: false },
    },
    {
      start: 160,
      duur: 160,
      tuplet: { aantal: 3, normaal: 2, begin: false, eind: false },
    },
    {
      start: 320,
      duur: 160,
      tuplet: { aantal: 3, normaal: 2, begin: false, eind: true },
    },
  ]);
  assert.deepEqual(elementen.map((element) => element.toonhoogte), [
    { stap: 'C', alter: 0, octaaf: 5 },
    { stap: 'C', alter: 0, octaaf: 5 },
    { stap: 'C', alter: 0, octaaf: 5 },
  ]);
});
