import test from 'node:test';
import assert from 'node:assert/strict';
import { zoekElement } from '../src/model/corrigeren.mjs';
import {
  zetFermate, zetArticulatie, zetOverbinding, voegNootToe, verwijderElement,
} from '../src/model/noten-bewerken.mjs';

const noot = (start, stap, octaaf, extra = {}) => ({
  soort: 'noot',
  start,
  duur: 480,
  stem: 1,
  notenbalk: 1,
  toonhoogte: { stap, alter: 0, octaaf },
  akkoord: false,
  overbinding: { begin: false, eind: false },
  articulaties: [],
  legato: { begin: false, eind: false },
  versiering: null,
  zekerheid: 0.6,
  ...extra,
});

const voorbeeld = () => ({
  versie: 1,
  titel: '',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'A',
    afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [
      {
        nummer: '1',
        index: 0,
        elementen: [
          noot(0, 'C', 4),
          { soort: 'rust', start: 480, duur: 240, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 0.6 },
          noot(720, 'D', 4),
          noot(1200, 'G', 4),
        ],
      },
      {
        nummer: '2',
        index: 1,
        elementen: [
          noot(0, 'D', 4),
          noot(480, 'E', 4),
        ],
      },
    ],
  }],
});

test('zetFermate zet en haalt fermate weg en laat het origineel ongemoeid', () => {
  const p = voorbeeld();
  const metFermate = zetFermate(p, 'n-P1-0-0', true);
  assert.equal(zoekElement(metFermate, 'n-P1-0-0').fermate, true);
  assert.equal(zoekElement(metFermate, 'n-P1-0-0').zekerheid, 1);
  assert.equal(zoekElement(p, 'n-P1-0-0').fermate, undefined);
  assert.equal(zoekElement(p, 'n-P1-0-0').zekerheid, 0.6);
  const zonderFermate = zetFermate(metFermate, 'n-P1-0-0', false);
  assert.equal(zoekElement(zonderFermate, 'n-P1-0-0').fermate, false);
  assert.equal(zoekElement(zonderFermate, 'n-P1-0-0').zekerheid, 1);
});

test('zetArticulatie voegt articulatie toe en haalt die weer weg', () => {
  const p = voorbeeld();
  const metArticulatie = zetArticulatie(p, 'n-P1-0-0', 'staccato');
  assert.deepEqual(zoekElement(metArticulatie, 'n-P1-0-0').articulaties, ['staccato']);
  assert.equal(zoekElement(metArticulatie, 'n-P1-0-0').zekerheid, 1);
  assert.deepEqual(zoekElement(p, 'n-P1-0-0').articulaties, []);
  const zonderArticulatie = zetArticulatie(metArticulatie, 'n-P1-0-0', 'staccato');
  assert.deepEqual(zoekElement(zonderArticulatie, 'n-P1-0-0').articulaties, []);
  assert.equal(zoekElement(zonderArticulatie, 'n-P1-0-0').zekerheid, 1);
});

test('zetArticulatie geeft een fout voor een onbekende articulatie', () => {
  assert.throws(() => zetArticulatie(voorbeeld(), 'n-P1-0-0', 'pizzicato'), {
    message: 'Onbekende articulatie.',
  });
});

test('zetOverbinding verbindt de volgende gelijke noot, ook in de volgende maat', () => {
  const p = voorbeeld();
  const verbonden = zetOverbinding(p, 'n-P1-0-2', true);
  assert.deepEqual(zoekElement(verbonden, 'n-P1-0-2').overbinding, { begin: true, eind: false });
  assert.deepEqual(zoekElement(verbonden, 'n-P1-1-0').overbinding, { begin: false, eind: true });
  assert.equal(zoekElement(verbonden, 'n-P1-0-2').zekerheid, 1);
  assert.equal(zoekElement(verbonden, 'n-P1-1-0').zekerheid, 1);
  assert.deepEqual(zoekElement(p, 'n-P1-0-2').overbinding, { begin: false, eind: false });
  const losgemaakt = zetOverbinding(verbonden, 'n-P1-0-2', false);
  assert.deepEqual(zoekElement(losgemaakt, 'n-P1-0-2').overbinding, { begin: false, eind: false });
  assert.deepEqual(zoekElement(losgemaakt, 'n-P1-1-0').overbinding, { begin: false, eind: false });
});

test('zetOverbinding geeft een fout als er geen gelijke noot volgt', () => {
  assert.throws(() => zetOverbinding(voorbeeld(), 'n-P1-0-3', true), {
    message: 'Er is geen noot met dezelfde toonhoogte om mee te verbinden.',
  });
});

test('voegNootToe maakt van een rust een noot en maakt die zeker', () => {
  const p = voorbeeld();
  const toegevoegd = voegNootToe(p, 'n-P1-0-1', { stap: 'A', alter: 0, octaaf: 4 });
  const element = zoekElement(toegevoegd, 'n-P1-0-1');
  assert.equal(element.soort, 'noot');
  assert.deepEqual(element.toonhoogte, { stap: 'A', alter: 0, octaaf: 4 });
  assert.equal(element.duur, 240);
  assert.equal(element.zekerheid, 1);
  assert.equal(zoekElement(p, 'n-P1-0-1').soort, 'rust');
});

test('verwijderElement maakt van een noot een rust met dezelfde duur en laat rusten staan', () => {
  const p = voorbeeld();
  const verwijderd = verwijderElement(p, 'n-P1-0-0');
  const element = zoekElement(verwijderd, 'n-P1-0-0');
  assert.equal(element.soort, 'rust');
  assert.equal(element.duur, 480);
  assert.equal(element.zekerheid, 1);
  assert.equal(zoekElement(p, 'n-P1-0-0').soort, 'noot');
  const ongewijzigd = verwijderElement(p, 'n-P1-0-1');
  assert.equal(zoekElement(ongewijzigd, 'n-P1-0-1').soort, 'rust');
});
