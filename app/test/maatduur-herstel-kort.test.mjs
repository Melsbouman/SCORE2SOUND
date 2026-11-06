import test from 'node:test';
import assert from 'node:assert/strict';
import { controleerMaatduur } from '../src/controle/maatduur.mjs';
import { herstelMaatduur } from '../src/model/maatduur.mjs';

const noot = (start, duur) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [],
  legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});

const maakPartituur = (elementen) => ({
  versie: 1,
  titel: '',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'P1',
    afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{
      nummer: '1',
      index: 0,
      opmaat: false,
      maatsoort: { teller: 4, noemer: 4 },
      toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }],
      tempo: null,
      herhaling: { begin: false, eind: false, keer: 2 },
      elementen,
    }],
  }],
});

test('een maat van anderhalve kwart wordt met rusten aangevuld tot vier kwarten', () => {
  const partituur = maakPartituur([noot(0, 480), noot(480, 240)]);

  const hersteld = herstelMaatduur(partituur, 'P1', 0);
  const elementen = hersteld.partijen[0].maten[0].elementen;

  assert.deepEqual(elementen.map(({ soort, start, duur }) => ({ soort, start, duur })), [
    { soort: 'noot', start: 0, duur: 480 },
    { soort: 'noot', start: 480, duur: 240 },
    { soort: 'rust', start: 720, duur: 960 },
    { soort: 'rust', start: 1680, duur: 240 },
  ]);
  assert.equal(Math.max(...elementen.map((element) => element.start + element.duur)), 1920);
  assert.deepEqual(controleerMaatduur(hersteld), []);
});

test('een maat van vijf kwarten verliest de vijfde kwartnoot', () => {
  const partituur = maakPartituur([
    noot(0, 480),
    noot(480, 480),
    noot(960, 480),
    noot(1440, 480),
    noot(1920, 480),
  ]);

  const hersteld = herstelMaatduur(partituur, 'P1', 0);

  assert.deepEqual(hersteld.partijen[0].maten[0].elementen.map(({ start, duur }) => ({ start, duur })), [
    { start: 0, duur: 480 },
    { start: 480, duur: 480 },
    { start: 960, duur: 480 },
    { start: 1440, duur: 480 },
  ]);
});
