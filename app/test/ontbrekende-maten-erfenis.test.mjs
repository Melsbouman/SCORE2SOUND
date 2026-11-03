import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { herstelMaatsoorten } from '../src/model/maatsoorten.mjs';
import { vulBeginRust } from '../src/model/beginrust.mjs';
import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';

const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const letter = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 1 });
const maat = (index, elementen = [noot(0)], extra = {}) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen, ...extra,
});
const stuk = (maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }],
});

test('ingevoegde onzekere maten erven geen maatrust, verborgen of herhaling van de maat waarvan ze een kopie zijn', () => {
  const maten = Array.from({ length: 10 }, (_, i) => maat(i));
  maten[4].elementen.unshift(letter('5'));
  maten[7] = maat(7, [letter('10'), noot(0)], { maatrust: 3, verborgen: true, herhaling: { begin: true, eind: true, keer: 3 } });
  const nieuw = vulOntbrekendeMaten(stuk(maten)).partijen[0].maten;
  assert.equal(nieuw.length, 12);
  for (const i of [7, 8]) {
    assert.equal(nieuw[i].maatrust, undefined, `maat ${i}`);
    assert.equal(nieuw[i].verborgen, undefined, `maat ${i}`);
    assert.deepEqual(nieuw[i].herhaling, { begin: false, eind: false, keer: 2 }, `maat ${i}`);
  }
});

test('op het echte stuk krijgen alleen de lege maten een maatrust, en er komen niet meer dan 20 maten bij', async () => {
  const p = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  const klaar = vulOntbrekendeMaten(vulBeginRust(herstelMaatsoorten(p)));
  const maten = klaar.partijen[0].maten;
  assert.ok(maten.length <= 62, `${maten.length} maten`);
  const metRust = maten.filter((m) => m.maatrust >= 2);
  assert.ok(metRust.length <= 4, `${metRust.length} maten met maatrust`);
  assert.equal(maten[0].maatrust, 12);
});
