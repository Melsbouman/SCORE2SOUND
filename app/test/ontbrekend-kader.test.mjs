import assert from 'node:assert/strict';
import test from 'node:test';

import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const rust = { soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 };
const noot = { soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1 };
const cijfer = (waarde, extra = {}) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde: String(waarde), zekerheid: 1, ...extra });
const maat = (nummer, elementen) => ({
  nummer: String(nummer), index: nummer - 1, opmaat: false, maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' }, sleutels: [], tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const reeks = (van, tot) => Array.from({ length: tot - van + 1 }, (_, index) => maat(van + index, [noot]));
const stuk = (maten) => ({ versie: 1, titel: '', componist: '', partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 56, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }] });

test('een repetitiecijfer in een kader op een rustmaat wordt geen meermaatsrust, ook bij weinig cijfers', () => {
  // Kaders 9, 17, 25 en 33 (allemaal onder de 40); maat 17 is een hele rust.
  const maten = [...reeks(1, 8), maat(9, [noot, cijfer(9, { kader: true })]), ...reeks(10, 16), maat(17, [rust, cijfer(17, { kader: true })]),
    ...reeks(18, 24), maat(25, [noot, cijfer(25, { kader: true })]), ...reeks(26, 32), maat(33, [noot, cijfer(33, { kader: true })])];
  const uit = vulOntbrekendeMaten(stuk(maten)).partijen[0].maten;
  assert.equal(uit.length, 33);
  assert.equal(uit[16].maatrust, undefined);
});

test('de rust die het aanvullen op een lege maat zet, krijgt verborgen maten en komt in de MusicXML als meermaatsrust', () => {
  const maten = [maat(1, [noot, cijfer(1)]), maat(2, [noot]), maat(3, []), maat(4, [noot]), maat(5, [noot, cijfer(7)])];
  const uit = vulOntbrekendeMaten(stuk(maten));
  const lijst = uit.partijen[0].maten;
  assert.deepEqual(lijst.map((huidige) => [huidige.nummer, huidige.maatrust ?? null, Boolean(huidige.verborgen)]),
    [['1', null, false], ['2', null, false], ['3', 3, false], ['4', null, true], ['5', null, true], ['6', null, false], ['7', null, false]]);
  assert.match(naarMusicXML(uit), /<multiple-rest>3<\/multiple-rest>/);
});

test('een lege maat in de eerste partij wist de noten van een andere partij niet', () => {
  const eerste = [maat(1, [noot, cijfer(1)]), maat(2, [noot]), maat(3, []), maat(4, [noot]), maat(5, [noot, cijfer(7)])];
  const tweede = [1, 2, 3, 4, 5].map((nummer) => maat(nummer, [noot]));
  const uit = vulOntbrekendeMaten({ partijen: [{ id: 'P1', maten: eerste }, { id: 'P2', maten: tweede }] });
  assert.equal(uit.partijen[1].maten.filter((huidige) => huidige.elementen.some((element) => element.soort === 'noot')).length, 5);
});
