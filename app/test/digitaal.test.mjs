import test from 'node:test';
import assert from 'node:assert/strict';
import { nootkopTeken, tweedeMening } from '../src/model/digitaal.mjs';

// Een pdf-pagina van 100 bij 100 punten en een blad van 1000 bij 1000 pixels (schaal 10). De balk staat op y 300-380 pixels,
// dus in pdf-punten tussen y 70 en 62. Maat 1 loopt van x 0 tot 500 pixels, maat 2 van 500 tot 1000.
const kop = (x, y = 66) => ({ lettertype: 'Maestro', code: 157, x, y, grootte: 20 });
const anders = (x) => ({ lettertype: 'Maestro', code: 38, x, y: 66, grootte: 20 });

function paginaMet(tekens) {
  return [{ pagina: 1, breedte: 100, hoogte: 100, tekens }];
}

function partituur(notenPerMaat) {
  return {
    bron: { herkenning: 'taak', bladen: [{ nummer: 1, breedte: 1000, hoogte: 1000 }] },
    partijen: [{
      id: 'P1',
      naam: 'Cornet',
      maten: notenPerMaat.map((duren, index) => ({
        nummer: String(index + 1),
        index,
        vak: { blad: 1, links: 500 * index, rechts: 500 * (index + 1), boven: 300, onder: 380 },
        elementen: duren.map((duur, i) => ({ soort: 'noot', start: i * 480, duur, stem: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 } })),
      })),
    }],
  };
}

const veelKoppen = Array.from({ length: 20 }, (_, i) => kop(5 + i));

test('de nootkop is het teken dat het vaakst voorkomt; te weinig tekens is geen digitale pdf', () => {
  assert.deepEqual(nootkopTeken(paginaMet([...veelKoppen, anders(1)])), { lettertype: 'Maestro', code: 157 });
  assert.equal(nootkopTeken(paginaMet([kop(5), kop(6)])), null);
  assert.equal(nootkopTeken([]), null);
});

test('een maat met evenveel zwarte nootkoppen als herkende korte noten geeft geen melding', () => {
  const tekens = [...Array.from({ length: 20 }, (_, i) => kop(5 + i * 2)), kop(60), kop(70)];
  const p = partituur([Array(20).fill(480), [240, 240]]);
  assert.deepEqual(tweedeMening(p, paginaMet(tekens)), []);
});

test('een maat waar de pdf meer nootkoppen heeft, krijgt een melding', () => {
  const tekens = [...Array.from({ length: 20 }, (_, i) => kop(5 + i * 2)), kop(60), kop(70), kop(80)];
  const p = partituur([Array(20).fill(480), [240, 240]]);
  const meldingen = tweedeMening(p, paginaMet(tekens));
  assert.equal(meldingen.length, 1);
  assert.deepEqual({ ...meldingen[0], tekst: undefined }, { soort: 'herkenning', ernst: 'waarschuwing', partij: 'P1', maat: 1, tekst: undefined });
  assert.equal(meldingen[0].tekst, 'Maat 2: de pdf heeft 3 zwarte nootkoppen, de herkenning 2. Kijk deze maat na.');
});

test('halve en hele noten en voorslagen tellen niet als zwarte noot; koppen ver van de balk tellen niet', () => {
  const tekens = [...veelKoppen, kop(60), kop(70, 5)];
  const p = partituur([Array(20).fill(240), [480, 960, 1920]]);
  p.partijen[0].maten[1].elementen.push({ soort: 'noot', start: 0, duur: 0, stem: 1, voorslag: { schuin: true }, toonhoogte: { stap: 'D', alter: 0, octaaf: 5 } });
  assert.deepEqual(tweedeMening(p, paginaMet(tekens)), []);
});

test('zonder digitale tekens (gescande pdf) of zonder vakken komt er niets', () => {
  assert.deepEqual(tweedeMening(partituur([[480]]), paginaMet([])), []);
  const zonderVak = partituur([Array(20).fill(480)]);
  delete zonderVak.partijen[0].maten[0].vak;
  assert.deepEqual(tweedeMening(zonderVak, paginaMet(veelKoppen)), []);
});
