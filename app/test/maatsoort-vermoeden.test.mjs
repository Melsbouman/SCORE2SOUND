import test from 'node:test';
import assert from 'node:assert/strict';
import { maatsoortVermoedens } from '../src/controle/maatduur.mjs';
import { vernieuwMeldingen } from '../src/controle/meldingen.mjs';

// Maten in 4/4; per maat het aantal kwarten dat erin staat.
function stuk(kwarten) {
  return {
    partijen: [{
      id: 'P1',
      maten: kwarten.map((aantal, index) => ({
        nummer: String(index + 57), index, maatsoort: { teller: 4, noemer: 4 },
        elementen: Array.from({ length: aantal }, (_, tel) => ({ soort: 'noot', start: tel * 480, duur: 480, stem: 1, zekerheid: 1 })),
      })),
    }],
  };
}

test('vier of meer maten op rij met elk 3 kwarten in 4/4 geven één melding: staat er misschien 3/4?', () => {
  const meldingen = maatsoortVermoedens(stuk([4, 3, 3, 3, 3, 3, 4]));
  assert.equal(meldingen.length, 1);
  assert.equal(meldingen[0].maat, 1);
  assert.equal(meldingen[0].soort, 'maatduur');
  assert.equal(meldingen[0].tekst, 'Maat 58 tot 62 duren elk 3 kwarten, terwijl er 4/4 staat: staat er misschien 3/4? Pas dan de maatsoort aan.');
});

test('drie maten op rij, of steeds een andere afwijking, geven geen melding', () => {
  assert.equal(maatsoortVermoedens(stuk([3, 3, 3, 4, 3, 3])).length, 0);
  assert.equal(maatsoortVermoedens(stuk([3, 2, 3, 2, 3, 2])).length, 0);
});

test('na een bewerking komt het vermoeden terug zolang de maten afwijken', () => {
  const uit = vernieuwMeldingen([], stuk([3, 3, 3, 3]));
  assert.equal(uit.filter((melding) => melding.tekst.includes('staat er misschien 3/4?')).length, 1);
});
