import test from 'node:test';
import assert from 'node:assert/strict';
import { meldIngevoegdeRusten, voegVerlorenRustenIn } from '../src/server/verlorenrusten.mjs';
import { stapelKaart } from '../src/model/stapels.mjs';

// Een blad van Audiveris met één systeem: kop tot x 219, de eerste stapel van 150 tot 976 met een maatstreep in het midden, en de
// eerste noot pas op x 600 (de rust ervoor liet Audiveris weg). Daarna een tweede stapel.
function blad() {
  const lijnen = [500, 519, 538, 557, 576].map((y) => `<line><point x="150" y="${y}"/><point x="2330" y="${y}"/></line>`).join('');
  return `<sheet><page><system id="1"><stack id="1" left="150" right="976"><slot id="1" x-offset="450" time-offset="0"/></stack>`
    + `<stack id="2" left="976" right="1455"><slot id="1" x-offset="32" time-offset="0"/></stack>`
    + `<part id="1"><staff id="1" left="150" right="2330"><lines>${lijnen}</lines><header start="150" stop="219"/></staff>`
    + `<measure id="1"><mid-barline/></measure><measure id="2"/></part></system></page></sheet>`;
}
const noot = { soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, zekerheid: 1 };
const maat = (index, vak, extra = {}) => ({
  nummer: String(index + 53), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, vak, elementen: [noot], ...extra,
});
const partij = (id) => ({ id, maten: [
  maat(0, { blad: 1, links: 150, rechts: 976, boven: 500, onder: 576 }, {
    regelbegin: true, sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1 }],
    elementen: [{ soort: 'aanwijzing', start: 0, type: 'letter', waarde: '53', zekerheid: 0.9, kader: true, plek: { blad: 1, x: 183 } }, noot],
  }),
  maat(1, { blad: 1, links: 976, rechts: 1455, boven: 500, onder: 576 }),
] });
const cijfer = (tekst) => ({ blad: 1, regels: [{ tekst, woorden: [{ tekst, x: 380, y: 440, breedte: 20, hoogte: 30 }] }] });

test('met het cijfer erboven komt de weggelaten meermaatsrust vóór de maat, met het begin van de regel en de letter', () => {
  const uit = voegVerlorenRustenIn({ partijen: [partij('P1')] }, [{ nummer: 1, xml: blad() }], [cijfer('3')]);
  const maten = uit.partijen[0].maten;
  assert.deepEqual(maten.map((m) => [m.nummer, m.maatrust ?? null, Boolean(m.verborgen), Boolean(m.ingevoegd)]),
    [['53', 3, false, true], ['54', null, true, true], ['55', null, true, true], ['56', null, false, false], ['57', null, false, false]]);
  assert.equal(maten[0].regelbegin, true);
  assert.equal(maten[0].sleutels.length, 1);
  assert.deepEqual(maten[0].elementen.map((e) => e.type ?? e.soort), ['rust', 'letter']);
  assert.equal(maten[0].elementen[0].zekerheid, 0.75);
  assert.deepEqual([maten[0].vak.links, maten[0].vak.rechts], [219, 562]);
  assert.equal(maten[3].regelbegin, false);
  assert.equal(maten[3].elementen.some((e) => e.type === 'letter'), false);
  assert.equal(maten[3].vak.links, 562);
  // De ingevoegde maten hebben geen eigen stapel bij Audiveris: de stapels wijzen nog naar dezelfde maten.
  assert.deepEqual(stapelKaart(maten), [3, 4]);
});

test('zonder cijfer wordt er niets ingevoegd (het kunnen ook gemiste noten zijn)', () => {
  const invoer = { partijen: [partij('P1')] };
  assert.deepEqual(voegVerlorenRustenIn(invoer, [{ nummer: 1, xml: blad() }], []), invoer);
});

test('alle partijen krijgen de rust, en de melding komt aan het eind met het nummer van dat moment', () => {
  const uit = voegVerlorenRustenIn({ partijen: [partij('P1'), partij('P2')] }, [{ nummer: 1, xml: blad() }], [cijfer('3')]);
  assert.deepEqual(uit.partijen.map((p) => p.maten.length), [5, 5]);
  const meldingen = meldIngevoegdeRusten(uit);
  assert.equal(meldingen.length, 1);
  assert.equal(meldingen[0].maat, 0);
  assert.match(meldingen[0].tekst, /^Maat 53: aan het begin van deze regel stond een meermaatsrust van 3 maten/);
});
