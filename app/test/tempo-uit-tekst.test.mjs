import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { tempoUitTekst } from '../src/model/tempotekst.mjs';

const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const tekst = (waarde, start = 0) => ({ soort: 'aanwijzing', start, type: 'tekst', waarde, zekerheid: 1 });
const stuk = (...maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: maten.map((elementen, index) => ({ nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen })) }],
});
const tempi = (p) => p.partijen[0].maten.flatMap((m) => m.elementen).filter((e) => e.soort === 'aanwijzing' && e.type === 'tempo');
const teksten = (p) => p.partijen[0].maten.flatMap((m) => m.elementen).filter((e) => e.soort === 'aanwijzing' && e.type === 'tekst').map((e) => e.waarde);

test('een punt-kwart (door de herkenning als J. gelezen) wordt omgerekend naar kwarten per minuut', () => {
  const nieuw = tempoUitTekst(stuk([tekst('Vivace risoluto (J. = 148)'), noot(0)]));
  assert.deepEqual(tempi(nieuw), [{ soort: 'aanwijzing', start: 0, type: 'tempo', waarde: 222, getoond: { eenheid: 'quarter', punt: true, getal: 148 }, zekerheid: 1 }]);
  assert.deepEqual(teksten(nieuw), ['Vivace risoluto']);
  assert.equal(nieuw.partijen[0].maten[0].tempo, 222);
});

test('een gewone kwart blijft hetzelfde getal, ook met het noteteken als tekst', () => {
  const nieuw = tempoUitTekst(stuk([tekst('Allegro (J = 120)'), noot(0)], [tekst('Andante ♩ = 96', 480), noot(0)]));
  assert.deepEqual(tempi(nieuw).map((t) => [t.waarde, t.getoond.punt]), [[120, false], [96, false]]);
  assert.deepEqual(teksten(nieuw), ['Allegro', 'Andante']);
  assert.equal(nieuw.partijen[0].maten[0].tempo, 120);
  assert.equal(nieuw.partijen[0].maten[1].tempo, null);
});

test('onwaarschijnlijke getallen en gewone tekst blijven ongemoeid', () => {
  for (const waarde of ['rit.', 'Tempo (J = 5)', 'Presto (J = 900)', 'All, cup mute']) {
    const oud = stuk([tekst(waarde), noot(0)]);
    assert.deepEqual(tempoUitTekst(oud), oud, waarde);
  }
});

test('een maat die al een tempo heeft, krijgt er geen tweede bij', () => {
  const oud = stuk([tekst('Allegro (J = 120)'), noot(0)]);
  oud.partijen[0].maten[0].tempo = 100;
  const nieuw = tempoUitTekst(oud);
  assert.equal(nieuw.partijen[0].maten[0].tempo, 100);
  assert.equal(tempi(nieuw).length, 0);
});

test('de invoer verandert niet en het echte stuk krijgt tempo 222 bij Vivace risoluto', async () => {
  const p = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  const kopie = structuredClone(p);
  const nieuw = tempoUitTekst(p);
  assert.deepEqual(p, kopie);
  assert.deepEqual(tempi(nieuw).map((t) => t.waarde), [222]);
});

test('een tempo met c. of een als nul gelezen c. (J = c.63 en J = 0.63) wordt 63', () => {
  for (const waarde of ['Poco più mosso ♩ = c.63', 'Poco più mosso J = 0.63', 'Andante misterioso ♩ = c.60']) {
    const nieuw = tempoUitTekst(stuk([tekst(waarde), noot(0)]));
    assert.equal(tempi(nieuw).length, 1, waarde);
    assert.ok([63, 60].includes(tempi(nieuw)[0].waarde), waarde);
  }
});
