import test from 'node:test';
import assert from 'node:assert/strict';
import { teksttekensNaarAanduidingen } from '../src/model/teksttekens.mjs';
import { herstelHerkenning } from '../src/model/herstel.mjs';

const noot = (start, teksten) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
  ...(teksten ? { teksten: teksten.map((lettergreep) => ({ couplet: 1, lettergreep, soort: 'single' })) } : {}),
});
const stuk = (elementen) => ({
  versie: 1, titel: 'T', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen }] }],
});
const aanw = (p) => p.partijen[0].maten[0].elementen.filter((e) => e.soort === 'aanwijzing').map((e) => [e.type, e.waarde, e.start]);
const teksten = (p) => p.partijen[0].maten[0].elementen.filter((e) => e.teksten?.length).map((e) => e.teksten[0].lettergreep);
const tien = (met) => Array.from({ length: 10 }, (_, i) => noot(i * 480, met[i]));

test('ff en marc. onder de balk (als zangtekst gelezen) worden de sterkte ff en de speelwijze Marcato', () => {
  const uit = teksttekensNaarAanduidingen(stuk(tien({ 0: ['FF'], 1: ['marc.'] })));
  assert.deepEqual(aanw(uit), [['dynamiek', 'ff', 0], ['tekst', 'Marcato', 480]]);
  assert.deepEqual(teksten(uit), []);
});

test('de OCR-fout mare wordt Marcato en cresc. blijft een sterkteverandering', () => {
  const uit = teksttekensNaarAanduidingen(stuk(tien({ 0: ['mare'], 4: ['cresc.'] })));
  assert.deepEqual(aanw(uit), [['tekst', 'Marcato', 0], ['dynamiek', 'cresc.', 1920]]);
});

test('echte zangtekst (de helft van de noten heeft tekst) blijft zoals hij is', () => {
  const woorden = { 0: ['Ho'], 1: ['san'], 2: ['na'], 3: ['in'], 4: ['ff'] };
  const uit = teksttekensNaarAanduidingen(stuk(tien(woorden)));
  assert.deepEqual(aanw(uit), []);
  assert.deepEqual(teksten(uit), ['Ho', 'san', 'na', 'in', 'ff']);
});

test('een woord dat geen aanduiding is blijft zangtekst, de invoer verandert niet', () => {
  const oud = stuk(tien({ 0: ['Verlag'], 1: ['ff'] }));
  const kopie = structuredClone(oud);
  const uit = teksttekensNaarAanduidingen(oud);
  assert.deepEqual(oud, kopie);
  assert.deepEqual(aanw(uit), [['dynamiek', 'ff', 480]]);
  assert.deepEqual(teksten(uit).includes('Verlag'), true);
});

test('de herstelketen zet ff marc. onder de balk om voordat de losse tekst wordt opgeruimd', () => {
  const uit = herstelHerkenning(stuk(tien({ 0: ['ff'], 1: ['marc.'] })));
  assert.deepEqual(aanw(uit).map(([type, waarde]) => [type, waarde]), [['dynamiek', 'ff'], ['tekst', 'Marcato']]);
});

test("de ligatuur fl met een apostrof (zo leest Audiveris ff in Galop) wordt ff, en mare. wordt Marcato", () => {
  const uit = teksttekensNaarAanduidingen(stuk(tien({ 0: ["ﬂ'"], 1: ['mare.'] })));
  assert.deepEqual(aanw(uit), [['dynamiek', 'ff', 0], ['tekst', 'Marcato', 480]]);
});
