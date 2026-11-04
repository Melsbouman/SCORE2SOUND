import test from 'node:test';
import assert from 'node:assert/strict';
import { scheidColofon } from '../src/model/colofon.mjs';

const noot = (start, teksten) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
  ...(teksten ? { teksten: teksten.map((lettergreep) => ({ couplet: 1, lettergreep, soort: 'single' })) } : {}),
});
const maat = (index, noten) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen: noten,
});
const stuk = (maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }],
});
const lettergrepen = (p) => p.partijen[0].maten.flatMap((m) => m.elementen.filter((e) => e.teksten?.length).map((e) => e.teksten[0].lettergreep));
const zin = ['Music', 'Studio', 'Verlag', 'AG,', 'CH', '-', '-', 'Wiedlisbach'];
const rij = (start, woorden) => woorden.map((w, i) => noot(start + i * 480, [w]));

test('dezelfde regel onder elke pagina wordt overal weggehaald en komt één keer als colofon terug', () => {
  const p = stuk([
    maat(0, rij(0, zin)), maat(1, [noot(0), noot(480)]),
    maat(2, rij(0, zin)), maat(3, [noot(0)]),
    maat(4, rij(0, zin)),
  ]);
  const kopie = structuredClone(p);
  const uit = scheidColofon(p);
  assert.deepEqual(p, kopie);
  assert.deepEqual(lettergrepen(uit.partituur), []);
  assert.equal(uit.colofon, 'Music Studio Verlag AG, CH Wiedlisbach');
});

test('een copyrightregel die maar één keer staat (een scan van één pagina) wordt ook colofon, echte zangtekst blijft', () => {
  const p = stuk([
    maat(0, [noot(0, ['Ho']), noot(480, ['san']), noot(960, ['na'])]),
    maat(1, rij(0, ['Copyright', 'Obrasso', 'Verlag', 'AG'])),
  ]);
  const uit = scheidColofon(p);
  assert.deepEqual(lettergrepen(uit.partituur), ['Ho', 'san', 'na']);
  assert.equal(uit.colofon, 'Copyright Obrasso Verlag AG');
});

test('zonder colofon verandert er niets en is colofon null', () => {
  const p = stuk([maat(0, [noot(0, ['Ho']), noot(480, ['san'])]), maat(1, [noot(0, ['na'])])]);
  const uit = scheidColofon(p);
  assert.deepEqual(uit.partituur, p);
  assert.equal(uit.colofon, null);
});

test('twee verschillende korte zinnen die geen colofon zijn blijven staan', () => {
  const p = stuk([maat(0, rij(0, ['Lo', 've', 'is', 'all'])), maat(1, rij(0, ['Sing', 'a', 'song', 'now']))]);
  assert.deepEqual(lettergrepen(scheidColofon(p).partituur), ['Lo', 've', 'is', 'all', 'Sing', 'a', 'song', 'now']);
});

test('een voetregel die verspreid onder de noten staat wordt één colofon (Galop: Copyright by Obrasso ... Switzerland)', () => {
  const p = stuk([
    maat(0, [noot(0, ['ff']), noot(480), noot(960)]),
    maat(0, Array.from({ length: 12 }, (_, i) => noot(i * 480))),
    maat(1, [noot(0, ['Copyright']), noot(480), noot(960, ['by']), noot(1440), noot(1920, ['Obrasso']), noot(2400, ['Verlag']), noot(2880), noot(3360, ['CH-4537'])]),
    maat(2, [noot(0), noot(480, ['Wiedlisbach,']), noot(960), noot(1440, ['Switzerland'])]),
  ]);
  const uit = scheidColofon(p);
  assert.equal(uit.colofon, 'Copyright by Obrasso Verlag CH-4537 Wiedlisbach, Switzerland');
  assert.deepEqual(lettergrepen(uit.partituur), ['ff']);
});
