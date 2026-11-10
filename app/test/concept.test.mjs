import test from 'node:test';
import assert from 'node:assert/strict';
import { isConcept, nakijkStand, conceptTekst, conceptTekstKort, markeerNagekeken } from '../src/model/concept.mjs';

test('conceptTekstKort geeft een korte tekst', () => {
  assert.equal(conceptTekstKort({ onzeker: 450, meldingen: 3 }), 'Concept: 450 onzekere noten, 3 meldingen');
  assert.equal(conceptTekstKort({ onzeker: 1, meldingen: 1 }), 'Concept: 1 onzekere noot, 1 melding');
  assert.equal(conceptTekstKort({ onzeker: 0, meldingen: 0 }), 'Concept: klaar om af te ronden');
});

function partituur(zekerheden, bron = { herkenning: 'taak-1', bladen: [] }) {
  return {
    versie: 1,
    titel: 'Galop',
    ...(bron ? { bron } : {}),
    partijen: [{
      id: 'P1',
      naam: 'Cornet',
      maten: [{
        nummer: '1',
        index: 0,
        elementen: zekerheden.map((zekerheid, i) => ({ id: `n${i}`, soort: 'noot', start: i * 480, duur: 480, stem: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, zekerheid })),
      }],
    }],
  };
}

test('een gescande partituur is een concept, een zelf gemaakte niet', () => {
  assert.equal(isConcept(partituur([1])), true);
  assert.equal(isConcept(partituur([1], null)), false);
  assert.equal(isConcept(null), false);
});

test('na nakijken is het geen concept meer, en bron blijft gelijk', () => {
  const p = partituur([0.5, 1]);
  const na = markeerNagekeken(p);
  assert.equal(isConcept(na), false);
  assert.equal(na.nagekeken, true);
  assert.equal(na.bron, p.bron);
  assert.equal(isConcept(p), true);
});

test('de stand telt onzekere noten en meldingen van de scan', () => {
  const meldingen = [
    { soort: 'herkenning', ernst: 'waarschuwing', partij: null, maat: null, tekst: 'a' },
    { soort: 'herkenning', ernst: 'waarschuwing', partij: null, maat: null, tekst: 'b' },
    { soort: 'maatduur', ernst: 'fout', partij: 'P1', maat: 0, tekst: 'c' },
  ];
  assert.deepEqual(nakijkStand(partituur([0.5, 0.79, 0.8, 1]), meldingen), { onzeker: 2, meldingen: 2 });
  assert.deepEqual(nakijkStand(partituur([1]), undefined), { onzeker: 0, meldingen: 0 });
});

test('de tekst is rustig Nederlands met enkelvoud en meervoud', () => {
  assert.equal(conceptTekst({ onzeker: 12, meldingen: 3 }), 'Concept uit een scan. Nog nakijken: 12 onzekere noten en 3 meldingen van de scan.');
  assert.equal(conceptTekst({ onzeker: 1, meldingen: 1 }), 'Concept uit een scan. Nog nakijken: 1 onzekere noot en 1 melding van de scan.');
});
