import test from 'node:test';
import assert from 'node:assert/strict';
import { vernieuwMeldingen } from '../src/controle/meldingen.mjs';
import { voegMaatToe, verwijderMaat } from '../src/model/maten-bewerken.mjs';

// Vier maten in 4/4 met elk een andere onzekere noot, zodat de maten van elkaar te onderscheiden zijn.
function partituur() {
  return {
    partijen: [{
      id: 'P1',
      maten: [60, 62, 64, 65].map((toon, index) => ({
        nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
        sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
        elementen: [{ soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { midi: toon }, zekerheid: 0.5 }],
      })),
    }],
  };
}
const melding = (maat) => ({ soort: 'herkenning', ernst: 'waarschuwing', partij: 'P1', maat, tekst: `bij maat ${maat + 1}` });
const herkenning = (meldingen) => meldingen.filter((m) => m.soort === 'herkenning').map((m) => [m.maat, m.tekst]);

test('een ingevoegde maat schuift de scanmeldingen erna één maat op', () => {
  const oud = partituur();
  const nieuw = voegMaatToe(oud, 1); // nieuwe maat na maat 2
  const uit = vernieuwMeldingen([melding(0), melding(1), melding(2), melding(3)], nieuw, oud);
  assert.deepEqual(herkenning(uit), [[0, 'bij maat 1'], [1, 'bij maat 2'], [3, 'bij maat 3'], [4, 'bij maat 4']]);
});

test('een weggehaalde maat neemt zijn scanmelding mee en schuift de rest terug', () => {
  const oud = partituur();
  const nieuw = verwijderMaat(oud, 1);
  const uit = vernieuwMeldingen([melding(0), melding(1), melding(2), melding(3)], nieuw, oud);
  assert.deepEqual(herkenning(uit), [[0, 'bij maat 1'], [1, 'bij maat 3'], [2, 'bij maat 4']]);
});

test('zonder vorige partituur of bij een gelijk aantal maten blijven de meldingen staan', () => {
  const oud = partituur();
  const meldingen = [melding(2)];
  assert.deepEqual(herkenning(vernieuwMeldingen(meldingen, oud)), [[2, 'bij maat 3']]);
  assert.equal(vernieuwMeldingen(meldingen, oud, oud).find((m) => m.soort === 'herkenning'), meldingen[0]);
});
