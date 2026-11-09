import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { maatLengte } from '../src/model/duur.mjs';
import { voegMeermaatsrustIn } from '../src/model/maten-bewerken.mjs';
import { meldIngevoegdeRusten, meldVerlorenRusten } from '../src/server/verlorenrusten.mjs';
import { vernieuwMeldingen } from '../src/controle/meldingen.mjs';

const vierKwart = { teller: 4, noemer: 4 };
const noot = (start) => ({ soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, zekerheid: 0.6 });
const maak = (index, extra = {}) => ({
  nummer: String(index + 1), index, maatsoort: vierKwart,
  toonsoort: { kwinten: -1, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }],
  tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [noot(0), noot(480), noot(960), noot(1440)],
  ...extra,
});
const vak = { blad: 1, links: 150, rechts: 976, boven: 500, onder: 576 };
const stuk = () => ({
  partijen: [
    { id: 'P1', maten: [maak(0), maak(1, { regelbegin: true, vak }), maak(2)] },
    { id: 'P2', maten: [maak(0), maak(1), maak(2)] },
  ],
});
const rust = { soort: 'rust', start: 0, duur: maatLengte(vierKwart), stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 };

test('een meermaatsrust van 3 maten komt vóór de maat, met twee verborgen maten erachter', () => {
  const origineel = stuk();
  const maten = voegMeermaatsrustIn(origineel, 'P1', 1, 3).partijen[0].maten;
  assert.equal(maten.length, 6);
  assert.deepEqual(maten.map((maat) => maat.index), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(maten.map((maat) => maat.nummer), ['1', '2', '3', '4', '5', '6']);
  const [eerste, ...verborgen] = maten.slice(1, 4);
  assert.equal(eerste.maatrust, 3);
  assert.ok(!eerste.verborgen);
  assert.deepEqual(verborgen.map((maat) => maat.verborgen), [true, true]);
  assert.equal(verborgen.some((maat) => 'maatrust' in maat), false);
  for (const maat of [eerste, ...verborgen]) {
    assert.equal(maat.ingevoegd, true);
    assert.equal(maat.vak, undefined);
    assert.deepEqual(maat.maatsoort, vierKwart);
    assert.deepEqual(maat.toonsoort, { kwinten: -1, modus: 'majeur' });
    assert.deepEqual(maat.elementen, [rust]);
  }
  // De oorspronkelijke maat schuift op, met zijn plek op het blad en zijn noten.
  assert.deepEqual(maten[4].vak, vak);
  assert.equal(maten[4].elementen.length, 4);
});

test('de rust neemt het regelbegin over; de andere partij en het origineel blijven gelijk', () => {
  const origineel = stuk();
  const nieuw = voegMeermaatsrustIn(origineel, 'P1', 1, 3);
  assert.equal(nieuw.partijen[0].maten[1].regelbegin, true);
  assert.equal(nieuw.partijen[0].maten[4].regelbegin, false);
  assert.deepEqual(nieuw.partijen[1], origineel.partijen[1]);
  assert.equal(origineel.partijen[0].maten.length, 3);
});

test('een rust van één maat is een gewone rustmaat, zonder maatrust en zonder verborgen maten', () => {
  const maten = voegMeermaatsrustIn(stuk(), 'P1', 0, 1).partijen[0].maten;
  assert.equal(maten.length, 4);
  assert.equal('maatrust' in maten[0], false);
  assert.deepEqual(maten[0].elementen, [rust]);
  assert.equal(maten.some((maat) => maat.verborgen), false);
  assert.deepEqual(maten.map((maat) => maat.nummer), ['1', '2', '3', '4']);
});

test('een ongeldig aantal, een onbekende partij of een onbekende maat geeft een fout', () => {
  for (const [partij, maat, aantal] of [['P1', 1, 0], ['P1', 1, 2.5], ['P1', 1, 1000], ['P1', 1, '3'], ['P9', 1, 3], ['P1', 7, 3]]) {
    assert.throws(() => voegMeermaatsrustIn(stuk(), partij, maat, aantal), Error);
  }
});

test('na het invoegen schuiven de andere scanmeldingen van die partij mee', () => {
  const vorige = stuk();
  const later = { soort: 'herkenning', ernst: 'waarschuwing', partij: 'P1', maat: 2, tekst: 'Maat 3: kijk deze maat na.' };
  const nieuw = voegMeermaatsrustIn(vorige, 'P1', 1, 3);
  const herkenning = vernieuwMeldingen([later], nieuw, vorige).filter((melding) => melding.soort === 'herkenning');
  assert.deepEqual(herkenning.map((melding) => melding.maat), [5]);
});

// Een blad van Audiveris met één systeem: kop tot x 219, de eerste stapel van 150 tot 976 en de eerste noot ver na de kop.
function blad() {
  const lijnen = [500, 519, 538, 557, 576].map((y) => `<line><point x="150" y="${y}"/><point x="2330" y="${y}"/></line>`).join('');
  return `<sheet><page><system id="1"><stack id="1" left="150" right="976"><slot id="1" x-offset="450" time-offset="0"/></stack>`
    + `<stack id="2" left="976" right="1455"><slot id="1" x-offset="32" time-offset="0"/></stack>`
    + `<part id="1"><staff id="1" left="150" right="2330"><lines>${lijnen}</lines><header start="150" stop="219"/></staff>`
    + '<measure id="1"><mid-barline/></measure><measure id="2"/></part></system></page></sheet>';
}
const scan = () => ({ partijen: [{ id: 'P1', maten: [
  { nummer: '1', index: 0, vak, elementen: [{ soort: 'noot' }] },
  { nummer: '2', index: 1, vak: { ...vak, links: 976, rechts: 1455 }, elementen: [{ soort: 'noot' }] },
] }] });
const cijfer = (tekst, x) => ({ blad: 1, regels: [{ tekst, woorden: [{ tekst, x, y: 440, breedte: 20, hoogte: 30 }] }] });

test('de melding over een weggelaten rust biedt invoegen aan, met het aantal als het cijfer te lezen is', () => {
  const [metCijfer] = meldVerlorenRusten(scan(), [{ nummer: 1, xml: blad() }], [cijfer('3', 380)]);
  assert.deepEqual(metCijfer.invoegen, { aantal: 3 });
  const [zonderCijfer] = meldVerlorenRusten(scan(), [{ nummer: 1, xml: blad() }], []);
  assert.deepEqual(zonderCijfer.invoegen, { aantal: null });
});

test('een rust die de app al heeft ingevoegd biedt geen invoegen meer aan', () => {
  const ingevoegd = { partijen: [{ id: 'P1', maten: [{ nummer: '1', index: 0, verlorenRust: 4, maatrust: 4, elementen: [] }] }] };
  const [melding] = meldIngevoegdeRusten(ingevoegd);
  assert.equal('invoegen' in melding, false);
});

test('het meldingenvlak toont bij zo\'n melding een veld voor het aantal en een knop Invoegen', async () => {
  const bron = await readFile(new URL('../public/js/views/meldingen.js', import.meta.url), 'utf8');
  assert.match(bron, /import \{[^}]*voegMeermaatsrustIn[^}]*\} from '\/src\/model\/maten-bewerken\.mjs'/);
  assert.match(bron, /import \{[^}]*vernieuwMeldingen[^}]*\} from '\/src\/controle\/meldingen\.mjs'/);
  assert.match(bron, /melding\.invoegen/);
  assert.match(bron, /type = 'number'/);
  assert.match(bron, /'Invoegen'/);
});
