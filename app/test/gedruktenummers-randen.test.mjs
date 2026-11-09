import test from 'node:test';
import assert from 'node:assert/strict';
import { vergelijkGedrukteMaatnummers, zetGedrukteNummers } from '../src/model/gedruktenummers.mjs';
import { vulBeginRust } from '../src/model/beginrust.mjs';

// Drie regels van vier maten (balk 80 pixels, regels op y 300, 700 en 1100).
function partituur(eersteBlad) {
  return {
    bron: { bladen: [{ nummer: eersteBlad }] },
    partijen: [{
      id: 'P1',
      maten: Array.from({ length: 12 }, (_, index) => ({
        nummer: String(index + 1), index, regelbegin: index % 4 === 0,
        vak: { blad: eersteBlad, links: 150 + (index % 4) * 500, rechts: 650 + (index % 4) * 500, boven: 300 + Math.floor(index / 4) * 400, onder: 380 + Math.floor(index / 4) * 400 },
        elementen: [],
      })),
    }],
  };
}
const nummers = (blad, getallen) => [{ blad, regels: getallen.map((getal, regel) => ({ tekst: String(getal), woorden: [{ tekst: String(getal), x: 150, y: 300 + regel * 400 - 50, breedte: 40, hoogte: 40 }] })) }];

test('bij een scan vanaf een latere pagina is de eerste regel het uitgangspunt en komt er alleen een melding waar het verschil verandert', () => {
  // Op het blad 45, 49 en 56: in regel 2 ontbreken 3 maten.
  const uit = vergelijkGedrukteMaatnummers(partituur(2), nummers(2, [45, 49, 56]));
  assert.equal(uit.meldingen.length, 1);
  assert.equal(uit.meldingen[0].maat, 8);
  assert.match(uit.meldingen[0].tekst, /ontbreken 3 maten/);
});

test('het cijfer midden boven een meermaatsrust aan het begin van de regel is geen gedrukt maatnummer', () => {
  const stuk = { partijen: [{ id: 'P1', maten: [
    { nummer: '21', index: 0, regelbegin: true, maatrust: 8, vak: { blad: 1, links: 219, rechts: 562, boven: 500, onder: 576 }, elementen: [] },
  ] }] };
  const woorden = [{ blad: 1, regels: [{ tekst: '8', woorden: [{ tekst: '8', x: 380, y: 440, breedte: 20, hoogte: 30 }] }] }];
  assert.equal(zetGedrukteNummers(stuk, woorden).partijen[0].maten[0].gedruktNummer, undefined);
});

test('de kopieën van een beginrust nemen geen meermaatsrust of verlorenRust van de eerste maat mee', () => {
  const eerste = {
    nummer: '1', index: 0, maatrust: 4, verlorenRust: 4, ingevoegd: true, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0 }, sleutels: [], tempo: null,
    herhaling: { begin: false, eind: false, keer: 2 }, elementen: [{ soort: 'aanwijzing', start: 0, type: 'letter', waarde: '5', zekerheid: 1 }, { soort: 'rust', start: 0, duur: 1920, heleMaat: true }],
  };
  const maten = vulBeginRust({ partijen: [{ id: 'P1', maten: [eerste] }] }).partijen[0].maten;
  assert.equal(maten.filter((maat) => maat.verlorenRust).length, 1);
  assert.deepEqual(maten.slice(0, 4).map((maat) => maat.maatrust ?? null), [4, null, null, null]);
});
