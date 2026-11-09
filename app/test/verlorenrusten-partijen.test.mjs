import test from 'node:test';
import assert from 'node:assert/strict';
import { voegVerlorenRustenIn } from '../src/server/verlorenrusten.mjs';

// Blad met één systeem: kop tot 219, eerste stapel 150-976 met een maatstreep in het midden, eerste noot op 600 (rust weggelaten).
function blad() {
  const lijnen = [500, 519, 538, 557, 576].map((y) => `<line><point x="150" y="${y}"/><point x="2330" y="${y}"/></line>`).join('');
  return `<sheet><page><system id="1"><stack id="1" left="150" right="976"><slot id="1" x-offset="450" time-offset="0"/></stack>`
    + `<stack id="2" left="976" right="1455"><slot id="1" x-offset="32" time-offset="0"/></stack>`
    + `<part id="1"><staff id="1" left="150" right="2330"><lines>${lijnen}</lines><header start="150" stop="219"/></staff>`
    + `<measure id="1"><mid-barline/></measure><measure id="2"/></part></system></page></sheet>`;
}
const noot = { soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, zekerheid: 1 };
const letter = (waarde, x) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 0.9, kader: true, plek: { blad: 1, x } });
const maat = (index, vak, extra = {}) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, vak, elementen: [noot], ...extra,
});
const samengevoegd = (extra = {}) => maat(0, { blad: 1, links: 150, rechts: 976, boven: 500, onder: 576 }, { regelbegin: true, ...extra });
const tweede = () => maat(1, { blad: 1, links: 976, rechts: 1455, boven: 500, onder: 576 });
const cijfer = [{ blad: 1, regels: [{ tekst: '8', woorden: [{ tekst: '8', x: 380, y: 440, breedte: 20, hoogte: 30 }] }] }];

test('een kader boven de inzet ná de rust blijft bij de maat (anders telt het aanvullen de rust dubbel)', () => {
  const stuk = { partijen: [{ id: 'P1', maten: [samengevoegd({ elementen: [letter('9', 700), noot] }), tweede()] }] };
  const maten = voegVerlorenRustenIn(stuk, [{ nummer: 1, xml: blad() }], cijfer).partijen[0].maten;
  assert.equal(maten[0].elementen.some((e) => e.type === 'letter'), false);
  assert.deepEqual(maten[8].elementen.filter((e) => e.type === 'letter').map((e) => e.waarde), ['9']);
  assert.equal(maten[8].nummer, '9');
});

test('gesplitste partijen: alleen de partij op dit blad krijgt de rust', () => {
  const tweedeDeel = [0, 1].map((index) => maat(index, { blad: 2, links: 150 + index * 500, rechts: 650 + index * 500, boven: 500, onder: 576 }));
  const uit = voegVerlorenRustenIn({ partijen: [{ id: 'P1', maten: [samengevoegd(), tweede()] }, { id: 'P2', maten: tweedeDeel }] }, [{ nummer: 1, xml: blad() }], cijfer);
  assert.equal(uit.partijen[0].maten.length, 10);
  assert.deepEqual(uit.partijen[1].maten, tweedeDeel);
});

test('een partituur met meer balken per systeem krijgt niets ingevoegd (de andere balken zijn niet nagekeken)', () => {
  const tweedeBalk = [samengevoegd(), tweede()].map((huidige) => ({ ...huidige, vak: { ...huidige.vak, boven: 700, onder: 776 } }));
  const stuk = { partijen: [{ id: 'P1', maten: [samengevoegd(), tweede()] }, { id: 'P2', maten: tweedeBalk }] };
  assert.deepEqual(voegVerlorenRustenIn(stuk, [{ nummer: 1, xml: blad() }], cijfer), stuk);
});

test('een herhaalteken aan het begin van de regel gaat naar de rust', () => {
  const stuk = { partijen: [{ id: 'P1', maten: [samengevoegd({ herhaling: { begin: true, eind: false, keer: 2 } }), tweede()] }] };
  const maten = voegVerlorenRustenIn(stuk, [{ nummer: 1, xml: blad() }], cijfer).partijen[0].maten;
  assert.equal(maten[0].herhaling.begin, true);
  assert.equal(maten[8].herhaling.begin, false);
});
