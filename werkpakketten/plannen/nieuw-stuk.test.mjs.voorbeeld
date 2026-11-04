import test from 'node:test';
import assert from 'node:assert/strict';
import { maakLeegStuk, voegPartijToe, verwijderPartij } from '../src/model/nieuw.mjs';

const opties = {
  titel: 'Mijn stuk',
  componist: 'Mels',
  maatsoort: { teller: 3, noemer: 4 },
  kwinten: -2,
  tempo: 90,
  aantalMaten: 4,
  instrumenten: ['trompet', 'tuba'],
};

test('maakLeegStuk maakt een partij per gekozen instrument met lege maten', () => {
  const stuk = maakLeegStuk(opties);
  assert.equal(stuk.versie, 1);
  assert.equal(stuk.titel, 'Mijn stuk');
  assert.equal(stuk.componist, 'Mels');
  assert.deepEqual(stuk.partijen.map((p) => p.id), ['P1', 'P2']);
  assert.equal(stuk.partijen[0].naam, 'Trompet in Bes');
  assert.deepEqual(stuk.partijen[0].instrument.transpositie, { chromatisch: -2, diatonisch: -1 });
  for (const partij of stuk.partijen) assert.equal(partij.maten.length, 4);
});

test('elke maat heeft nummer, index, maatsoort, toonsoort, sleutel en een maatrust van de juiste duur', () => {
  const stuk = maakLeegStuk(opties);
  const [trompet, tuba] = stuk.partijen;
  const maat = trompet.maten[2];
  assert.equal(maat.nummer, '3');
  assert.equal(maat.index, 2);
  assert.deepEqual(maat.maatsoort, { teller: 3, noemer: 4 });
  assert.deepEqual(maat.toonsoort, { kwinten: -2, modus: 'majeur' });
  assert.equal(maat.maatrust, true);
  assert.equal(maat.elementen.length, 1);
  assert.equal(maat.elementen[0].soort, 'rust');
  assert.equal(maat.elementen[0].start, 0);
  assert.equal(maat.elementen[0].duur, 1440);
  assert.equal(maat.elementen[0].zekerheid, 1);
  assert.equal(trompet.maten[0].sleutels[0].teken, 'G');
  assert.equal(tuba.maten[0].sleutels[0].teken, 'F');
  assert.equal(trompet.maten[0].tempo, 90);
  assert.equal(trompet.maten[1].tempo, null);
});

test('maakLeegStuk zonder opties geeft een bruikbaar stuk: 4/4, C-groot, 8 maten, een partij', () => {
  const stuk = maakLeegStuk({});
  assert.equal(stuk.titel, '');
  assert.equal(stuk.partijen.length, 1);
  assert.equal(stuk.partijen[0].maten.length, 8);
  assert.deepEqual(stuk.partijen[0].maten[0].maatsoort, { teller: 4, noemer: 4 });
  assert.equal(stuk.partijen[0].maten[0].elementen[0].duur, 1920);
});

test('een onbekend instrument of te weinig maten geeft een duidelijke fout', () => {
  assert.throws(() => maakLeegStuk({ instrumenten: ['bestaat-niet'] }), /instrument/i);
  assert.throws(() => maakLeegStuk({ aantalMaten: 0 }), /maten/i);
});

test('voegPartijToe zet een lege partij erbij met dezelfde maten, zonder het origineel te wijzigen', () => {
  const stuk = maakLeegStuk(opties);
  const nieuw = voegPartijToe(stuk, 'klarinet');
  assert.equal(stuk.partijen.length, 2);
  assert.equal(nieuw.partijen.length, 3);
  assert.equal(nieuw.partijen[2].id, 'P3');
  assert.equal(nieuw.partijen[2].maten.length, 4);
  assert.deepEqual(nieuw.partijen[2].maten[0].maatsoort, { teller: 3, noemer: 4 });
});

test('verwijderPartij haalt een partij weg maar nooit de laatste', () => {
  const stuk = maakLeegStuk(opties);
  const minder = verwijderPartij(stuk, 'P1');
  assert.deepEqual(minder.partijen.map((p) => p.id), ['P2']);
  assert.throws(() => verwijderPartij(minder, 'P2'), /laatste/i);
});
