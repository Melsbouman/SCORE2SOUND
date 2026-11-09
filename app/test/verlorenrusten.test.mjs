import test from 'node:test';
import assert from 'node:assert/strict';
import { meldVerlorenRusten, verlorenRustenVanBlad } from '../src/server/verlorenrusten.mjs';

// Een blad van Audiveris met één systeem: kop (sleutel) tot x 219, de eerste stapel van 150 tot 976 en de eerste noot op 150 + slot.
function blad({ slot = 450, middenstreep = true } = {}) {
  const lijnen = [500, 519, 538, 557, 576].map((y) => `<line><point x="150" y="${y}"/><point x="2330" y="${y}"/></line>`).join('');
  return `<sheet><page><system id="1"><stack id="1" left="150" right="976"><slot id="1" x-offset="${slot}" time-offset="0"/></stack>`
    + `<stack id="2" left="976" right="1455"><slot id="1" x-offset="32" time-offset="0"/></stack>`
    + `<part id="1"><staff id="1" left="150" right="2330"><lines>${lijnen}</lines><header start="150" stop="219"/></staff>`
    + `<measure id="1">${middenstreep ? '<mid-barline/>' : ''}</measure><measure id="2"/></part></system></page></sheet>`;
}
const maat = (index, vak) => ({ nummer: String(index + 1), index, vak, elementen: [{ soort: 'noot' }] });
const partituur = () => ({ partijen: [{ id: 'P1', maten: [
  maat(0, { blad: 1, links: 150, rechts: 976, boven: 500, onder: 576 }),
  maat(1, { blad: 1, links: 976, rechts: 1455, boven: 500, onder: 576 }),
] }] });
const cijfer = (tekst, x) => ({ blad: 1, regels: [{ tekst, woorden: [{ tekst, x, y: 440, breedte: 20, hoogte: 30 }] }] });

test('een maatstreep in het midden van de eerste maat en veel ruimte na de kop: een weggelaten rust', () => {
  const plekken = verlorenRustenVanBlad(blad());
  assert.equal(plekken.length, 1);
  assert.deepEqual([plekken[0].links, plekken[0].stackLinks, plekken[0].stackRechts], [219, 150, 976]);
});

test('zonder maatstreep in het midden of met de eerste noot vlak na de kop is er niets weggelaten', () => {
  assert.deepEqual(verlorenRustenVanBlad(blad({ middenstreep: false })), []);
  assert.deepEqual(verlorenRustenVanBlad(blad({ slot: 100 })), []);
});

test('met het cijfer boven de lege plek noemt de melding het aantal maten', () => {
  const [melding] = meldVerlorenRusten(partituur(), [{ nummer: 1, xml: blad() }], [cijfer('3', 380)]);
  assert.equal(melding.maat, 0);
  assert.match(melding.tekst, /meermaatsrust van 3 maten die niet is herkend/);
});

test('zonder cijfer zegt de melding dat er iets gemist is', () => {
  const [melding] = meldVerlorenRusten(partituur(), [{ nummer: 1, xml: blad() }], []);
  assert.match(melding.tekst, /iets gemist \(een rust of noten\)/);
});

test('geen melding als er vlak ervoor al een ingevoegde rust staat (zoals een beginrust)', () => {
  const stuk = partituur();
  stuk.partijen[0].maten.unshift({ nummer: '0', index: -1, elementen: [{ soort: 'rust', heleMaat: true }], maatrust: 12 });
  assert.deepEqual(meldVerlorenRusten(stuk, [{ nummer: 1, xml: blad() }], [cijfer('12', 380)]), []);
});
