import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakOpslag } from '../src/project/opslag.mjs';
import { maatReeks, verschillen } from '../src/model/versies.mjs';

const noot = (stap, extra = {}) => ({ soort: 'noot', start: 0, duur: 1920, toonhoogte: { stap, alter: 0, octaaf: 4 }, zekerheid: 1, ...extra });
const maat = (index, stap, extra) => ({ nummer: String(index + 1), index, elementen: [noot(stap, extra)] });
const partij = (id, naam, stappen, instrument = { midiProgramma: 0 }) => ({ id, naam, instrument, maten: stappen.map((stap, index) => maat(index, stap)) });
const partituur = (...partijen) => ({ versie: 1, titel: 'Mars', partijen });

test('gelijke versies hebben geen verschillen', () => {
  const a = partituur(partij('P1', 'Bugel', ['C', 'D']));
  assert.deepEqual(verschillen(a, structuredClone(a)), { partijen: [], maten: [] });
});

test('een andere noot geeft de maat en de partij', () => {
  const oud = partituur(partij('P1', 'Bugel', ['C', 'D', 'E']), partij('P2', 'Tuba', ['C', 'D', 'E']));
  const nieuw = partituur(partij('P1', 'Bugel', ['C', 'F', 'E']), partij('P2', 'Tuba', ['G', 'D', 'A']));
  assert.deepEqual(verschillen(oud, nieuw), {
    partijen: [
      { id: 'P1', naam: 'Bugel', soort: 'gewijzigd', maten: [1] },
      { id: 'P2', naam: 'Tuba', soort: 'gewijzigd', maten: [0, 2] },
    ],
    maten: [0, 1, 2],
  });
});

test('zekerheid en plek tellen niet mee, de naam van de partij ook niet', () => {
  const oud = partituur(partij('P1', 'Bugel', ['C']));
  const nieuw = structuredClone(oud);
  nieuw.partijen[0].naam = 'Eerste bugel';
  nieuw.partijen[0].maten[0].elementen[0].zekerheid = 0.4;
  nieuw.partijen[0].maten[0].elementen[0].plek = { blad: 1, x: 2, y: 3, breedte: 4, hoogte: 5 };
  assert.deepEqual(verschillen(oud, nieuw), { partijen: [], maten: [] });
});

test('een extra maat aan het einde telt als verschil', () => {
  const oud = partituur(partij('P1', 'Bugel', ['C']));
  const nieuw = partituur(partij('P1', 'Bugel', ['C', 'D']));
  assert.deepEqual(verschillen(oud, nieuw).maten, [1]);
  assert.deepEqual(verschillen(nieuw, oud).maten, [1]);
});

test('een ander instrument is een verschil zonder maten', () => {
  const oud = partituur(partij('P1', 'Bugel', ['C']));
  const nieuw = partituur(partij('P1', 'Bugel', ['C'], { midiProgramma: 56 }));
  assert.deepEqual(verschillen(oud, nieuw).partijen, [{ id: 'P1', naam: 'Bugel', soort: 'gewijzigd', maten: [] }]);
});

test('een nieuwe en een verdwenen partij', () => {
  const oud = partituur(partij('P1', 'Bugel', ['C']), partij('P2', 'Tuba', ['C']));
  const nieuw = partituur(partij('P1', 'Bugel', ['C']), partij('P3', 'Hoorn', ['C']));
  assert.deepEqual(verschillen(oud, nieuw).partijen, [
    { id: 'P3', naam: 'Hoorn', soort: 'nieuw', maten: [] },
    { id: 'P2', naam: 'Tuba', soort: 'weg', maten: [] },
  ]);
});

test('maatReeks maakt korte reeksen met de echte maatnummers', () => {
  const maten = [{ nummer: '0' }, { nummer: '1' }, { nummer: '2' }, { nummer: '3' }, { nummer: 'X1' }];
  assert.equal(maatReeks([0, 2, 3, 4], maten), '0, 2-X1');
  assert.equal(maatReeks([1], maten), '1');
  assert.equal(maatReeks([], maten), '');
  assert.equal(maatReeks([3, 9], maten), '3');
});

async function opslag(t) {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-versies-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  return maakOpslag(map);
}

test('een project bewaart zijn versies, ook als ze niet opnieuw meekomen', async (t) => {
  const projecten = await opslag(t);
  const inhoud = partituur(partij('P1', 'Bugel', ['C']));
  const versies = [{ id: 'v1', naam: 'Versie 1', tijd: '2026-11-02T10:00:00.000Z', partituur: inhoud }];

  const eerste = await projecten.bewaar({ naam: 'Mars', partituur: inhoud, versies });
  assert.deepEqual((await projecten.open(eerste.id)).versies, versies);

  await projecten.bewaar({ id: eerste.id, naam: 'Mars', partituur: inhoud });
  assert.deepEqual((await projecten.open(eerste.id)).versies, versies);

  await projecten.bewaar({ id: eerste.id, naam: 'Mars', partituur: inhoud, versies: [] });
  assert.deepEqual((await projecten.open(eerste.id)).versies, []);
});

test('een nieuw project zonder versies heeft een lege lijst', async (t) => {
  const projecten = await opslag(t);
  const project = await projecten.bewaar({ naam: 'Mars', partituur: partituur() });
  assert.deepEqual(project.versies, []);
});
