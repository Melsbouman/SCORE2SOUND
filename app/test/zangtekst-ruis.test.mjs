import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { ruimZangtekstOp } from '../src/model/zangtekst.mjs';

const noot = (start, teksten) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
  ...(teksten ? { teksten: teksten.map((lettergreep) => ({ couplet: 1, lettergreep, soort: 'single' })) } : {}),
});
const stuk = (elementen) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen }] }],
});
const aantal = (p) => p.partijen[0].maten[0].elementen.filter((e) => e.teksten?.length).length;

test('weinig zangtekst bij veel noten is ruis (paginatekst, haakjes) en verdwijnt', () => {
  const noten = Array.from({ length: 10 }, (_, i) => noot(i * 480, i === 0 ? ['Copyright'] : i === 1 ? ['L,'] : undefined));
  const nieuw = ruimZangtekstOp(stuk(noten));
  assert.equal(aantal(stuk(noten)), 2);
  assert.equal(aantal(nieuw), 0);
});

test('echte zangtekst (bij de meeste noten) blijft staan', () => {
  const noten = [noot(0, ['Ho']), noot(480, ['san']), noot(960, ['na']), noot(1440, ['in']), noot(1920, ['ex']), noot(2400)];
  assert.equal(aantal(ruimZangtekstOp(stuk(noten))), 5);
});

test('rusten en de tweede noot van een overbinding tellen niet mee en de invoer verandert niet', () => {
  const rust = { soort: 'rust', start: 0, duur: 480, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 };
  const oud = stuk([rust, rust, noot(960, ['x']), noot(1440), noot(1920), noot(2400), noot(2880)]);
  const nieuw = ruimZangtekstOp(oud);
  assert.equal(aantal(nieuw), 0);
  assert.equal(aantal(oud), 1);
});

test('op het echte stuk (Sand and Stars) verdwijnen de 14 stukjes ruis', async () => {
  const p = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  const tel = (x) => x.partijen[0].maten.flatMap((m) => m.elementen).filter((e) => e.teksten?.length).length;
  assert.equal(tel(p), 14);
  assert.equal(tel(ruimZangtekstOp(p)), 0);
});
