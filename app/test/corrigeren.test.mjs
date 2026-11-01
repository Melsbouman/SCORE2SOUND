import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leesId, zoekElement, onzekereElementen, verschuif, zetAlter, zetDuur, maakRust, maakNoot, keurGoed,
} from '../src/model/corrigeren.mjs';

const noot = (start, stap, octaaf, extra = {}) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap, alter: 0, octaaf }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 0.6, ...extra,
});
const voorbeeld = () => ({
  versie: 1, titel: '', componist: '',
  partijen: [{
    id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{
      nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' }, sleutels: [], tempo: null,
      herhaling: { begin: false, eind: false, keer: 2 },
      elementen: [
        { soort: 'aanwijzing', start: 0, type: 'dynamiek', waarde: 'mf', zekerheid: 1 },
        noot(0, 'B', 4),
        noot(480, 'C', 5, { zekerheid: 1 }),
        noot(480, 'E', 5, { akkoord: true, zekerheid: 1 }),
        { soort: 'rust', start: 960, duur: 960, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 0.7, plek: { blad: 1, x: 1, y: 2, breedte: 3, hoogte: 4 } },
      ],
    }],
  }],
});

test('leesId en zoekElement vinden een element, ook als het partij-id een streepje heeft', () => {
  assert.deepEqual(leesId('n-P1-bugel-3-12'), { partijId: 'P1-bugel', maatIndex: 3, elementIndex: 12 });
  assert.equal(zoekElement(voorbeeld(), 'n-P1-0-1').toonhoogte.stap, 'B');
  assert.equal(zoekElement(voorbeeld(), 'n-P9-0-1'), null);
  assert.equal(zoekElement(voorbeeld(), 'n-P1-0-99'), null);
});

test('onzekereElementen geeft de ids onder 0,8 in volgorde, zonder aanwijzingen', () => {
  assert.deepEqual(onzekereElementen(voorbeeld()), ['n-P1-0-1', 'n-P1-0-4']);
});

test('verschuif gaat een lijn of tussenruimte verder, over het octaaf heen, en maakt zeker', () => {
  const omhoog = verschuif(voorbeeld(), 'n-P1-0-1', 1);
  assert.deepEqual(zoekElement(omhoog, 'n-P1-0-1').toonhoogte, { stap: 'C', alter: 0, octaaf: 5 });
  assert.equal(zoekElement(omhoog, 'n-P1-0-1').zekerheid, 1);
  const omlaag = verschuif(voorbeeld(), 'n-P1-0-2', -1);
  assert.deepEqual(zoekElement(omlaag, 'n-P1-0-2').toonhoogte, { stap: 'B', alter: 0, octaaf: 4 });
});

test('een correctie laat de oorspronkelijke partituur met rust', () => {
  const p = voorbeeld();
  verschuif(p, 'n-P1-0-1', 1);
  assert.equal(zoekElement(p, 'n-P1-0-1').toonhoogte.stap, 'B');
  assert.equal(zoekElement(p, 'n-P1-0-1').zekerheid, 0.6);
});

test('zetAlter zet het voorteken', () => {
  assert.equal(zoekElement(zetAlter(voorbeeld(), 'n-P1-0-1', -1), 'n-P1-0-1').toonhoogte.alter, -1);
});

test('zetDuur verandert ook de andere noten van het akkoord', () => {
  const p = zetDuur(voorbeeld(), 'n-P1-0-2', 240);
  assert.equal(zoekElement(p, 'n-P1-0-2').duur, 240);
  assert.equal(zoekElement(p, 'n-P1-0-3').duur, 240);
  assert.equal(zoekElement(p, 'n-P1-0-1').duur, 480);
});

test('maakRust maakt van een losse noot een rust op dezelfde plaats', () => {
  const r = zoekElement(maakRust(voorbeeld(), 'n-P1-0-1'), 'n-P1-0-1');
  assert.equal(r.soort, 'rust');
  assert.deepEqual([r.start, r.duur, r.stem, r.notenbalk, r.heleMaat, r.zekerheid], [0, 480, 1, 1, false, 1]);
  assert.equal(r.toonhoogte, undefined);
});

test('maakRust haalt een akkoordnoot weg; de overgebleven noot is geen akkoordnoot', () => {
  const p = maakRust(voorbeeld(), 'n-P1-0-2');
  assert.equal(p.partijen[0].maten[0].elementen.length, 4);
  const overig = zoekElement(p, 'n-P1-0-2');
  assert.equal(overig.toonhoogte.stap, 'E');
  assert.equal(overig.akkoord, false);
});

test('maakNoot maakt van een rust een noot en behoudt de plek', () => {
  const n = zoekElement(maakNoot(voorbeeld(), 'n-P1-0-4', { stap: 'G', alter: 0, octaaf: 4 }), 'n-P1-0-4');
  assert.equal(n.soort, 'noot');
  assert.deepEqual(n.toonhoogte, { stap: 'G', alter: 0, octaaf: 4 });
  assert.deepEqual([n.start, n.duur, n.akkoord, n.zekerheid], [960, 960, false, 1]);
  assert.deepEqual(n.overbinding, { begin: false, eind: false });
  assert.deepEqual(n.plek, { blad: 1, x: 1, y: 2, breedte: 3, hoogte: 4 });
});

test('keurGoed maakt een element zeker zonder iets anders te veranderen', () => {
  const p = keurGoed(voorbeeld(), 'n-P1-0-4');
  assert.equal(zoekElement(p, 'n-P1-0-4').zekerheid, 1);
  assert.deepEqual(onzekereElementen(p), ['n-P1-0-1']);
});
