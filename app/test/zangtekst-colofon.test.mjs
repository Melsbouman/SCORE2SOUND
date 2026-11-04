import test from 'node:test';
import assert from 'node:assert/strict';
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
const teksten = (p) => p.partijen[0].maten[0].elementen.filter((e) => e.teksten?.length).map((e) => e.teksten[0].lettergreep);

test('colofon en copyrighttekst die als zangtekst is gelezen verdwijnt, ook als de rest van de tekst blijft staan', () => {
  const noten = [noot(0, ['Ho']), noot(480, ['san']), noot(960, ['Copyright']), noot(1440, ['Obrasso']), noot(1920, ['Verlag']),
    noot(2400, ['AG']), noot(2880, ['Wiedlisbach']), noot(3360, ['Switzerland']), noot(3840, ['na']), noot(4320, ['in'])];
  assert.deepEqual(teksten(ruimZangtekstOp(stuk(noten))), ['Ho', 'san', 'na', 'in']);
});

test('woorden als verlag, publishing, rights en het copyrightteken worden herkend, gewone zangtekst niet', () => {
  const noten = [noot(0, ['\u00a9']), noot(480, ['Publishing']), noot(960, ['Rights']), noot(1440, ['reserved']), noot(1920, ['Music']),
    noot(2400, ['Copyr.']), noot(2880, ['sing']), noot(3360, ['love'])];
  assert.deepEqual(teksten(ruimZangtekstOp(stuk(noten))), ['sing', 'love']);
});
