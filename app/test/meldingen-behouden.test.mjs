import test from 'node:test';
import assert from 'node:assert/strict';
import { vernieuwMeldingen } from '../src/controle/meldingen.mjs';

// Een partituur in 4/4 met een partij; per maat een lijst [duur, zekerheid] van noten.
function partituur(maten) {
  return {
    partijen: [{
      id: 'P1',
      naam: 'Cornet',
      maten: maten.map((noten, index) => {
        let start = 0;
        return {
          nummer: String(index + 1),
          index,
          maatsoort: { teller: 4, noemer: 4 },
          elementen: noten.map(([duur, zekerheid]) => {
            const e = { soort: 'noot', start, duur, stem: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 4 }, zekerheid };
            start += duur;
            return e;
          }),
        };
      }),
    }],
  };
}

const herkenPagina = { soort: 'herkenning', ernst: 'waarschuwing', partij: null, maat: null, tekst: 'Op pagina 2 is de zekerheid per noot onbekend.' };
const herkenMaat = { soort: 'herkenning', ernst: 'waarschuwing', partij: 'P1', maat: 0, tekst: 'Maat 1: noot niet gekoppeld.' };
const oudeMaatduur = { soort: 'maatduur', ernst: 'fout', partij: 'P1', maat: 1, tekst: 'oud' };

test('meldingen uit de herkenning blijven na een bewerking staan', () => {
  const p = partituur([[[1920, 0.5]], [[1920, 0.9]]]);
  const uit = vernieuwMeldingen([herkenPagina, herkenMaat, oudeMaatduur], p);
  assert.ok(uit.includes(herkenPagina));
  assert.ok(uit.includes(herkenMaat));
});

test('de maatduur-controle wordt opnieuw gedaan en oude maatduur-meldingen verdwijnen', () => {
  const p = partituur([[[1920, 1]], [[960, 1]]]);
  const uit = vernieuwMeldingen([oudeMaatduur], p);
  assert.ok(!uit.includes(oudeMaatduur));
  const maatduur = uit.filter((m) => m.soort === 'maatduur');
  assert.equal(maatduur.length, 1);
  assert.equal(maatduur[0].maat, 1);
});

test('een herkenningsmelding bij een goedgekeurde maat verdwijnt', () => {
  const p = partituur([[[960, 1], [960, 1]], [[1920, 0.5]]]);
  const uit = vernieuwMeldingen([herkenPagina, herkenMaat], p);
  assert.ok(!uit.includes(herkenMaat));
  assert.ok(uit.includes(herkenPagina));
});

test('zonder oude meldingen komt alleen de controle terug', () => {
  const p = partituur([[[1920, 1]]]);
  assert.deepEqual(vernieuwMeldingen(undefined, p), []);
});
